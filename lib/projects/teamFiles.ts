import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  classifyProjectFileCategory,
  PROJECT_FILE_BUCKET,
  PROJECT_FILE_MAX_BYTES,
  sanitizeProjectFileName,
  validateProjectFileCandidate,
  type ProjectSharedFile,
} from './teamFilesTypes'

type StoredFileSnapshot = {
  fileId: string
  objectPath: string
  fileName: string
  label: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string | null
  uploaderName: string
  note: string
  createdAt: string
}

async function ensureProjectFilesBucket() {
  const admin = createSupabaseAdminClient()
  const { data: bucket } = await admin.storage.getBucket(PROJECT_FILE_BUCKET)
  if (!bucket) {
    const { error } = await admin.storage.createBucket(PROJECT_FILE_BUCKET, {
      public: false,
      fileSizeLimit: PROJECT_FILE_MAX_BYTES,
    })
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`PROJECT_FILES_BUCKET_FAILED:${error.message}`)
    }
  }
  return admin
}

function parseFileIdFromStorageName(name: string): { fileId: string; fileName: string } | null {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})--(.+)$/i.exec(name)
  if (!match) return null
  return { fileId: match[1], fileName: match[2] }
}

/** List uploaded shared files for a project (authoritative Storage objects enriched with uploader metadata). */
export async function listProjectSharedFiles(projectId: string): Promise<ProjectSharedFile[]> {
  const admin = createSupabaseAdminClient()
  const folder = `${projectId}/files`
  const [{ data: objects, error }, { data: metaRows }] = await Promise.all([
    admin.storage.from(PROJECT_FILE_BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
    admin
      .from('audit_log')
      .select('after_snapshot,created_at')
      .eq('entity_type', 'project_shared_file')
      .eq('entity_id', projectId)
      .eq('action', 'PROJECT_FILE_UPLOADED')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (error) {
    if (/bucket not found/i.test(error.message)) return []
    throw new Error(`PROJECT_FILES_LIST_FAILED:${error.message}`)
  }

  const byFileId = new Map<string, StoredFileSnapshot>()
  for (const row of metaRows ?? []) {
    const snap = row.after_snapshot as Partial<StoredFileSnapshot> | null
    if (snap?.fileId && !byFileId.has(snap.fileId)) {
      byFileId.set(snap.fileId, {
        fileId: snap.fileId,
        objectPath: String(snap.objectPath ?? ''),
        fileName: String(snap.fileName ?? 'file'),
        label: String(snap.label ?? ''),
        mimeType: String(snap.mimeType ?? 'application/octet-stream'),
        sizeBytes: Number(snap.sizeBytes ?? 0),
        uploadedBy: typeof snap.uploadedBy === 'string' ? snap.uploadedBy : null,
        uploaderName: String(snap.uploaderName ?? 'Member'),
        note: String(snap.note ?? ''),
        createdAt: String(snap.createdAt ?? row.created_at),
      })
    }
  }

  const files: ProjectSharedFile[] = []
  for (const obj of objects ?? []) {
    if (!obj.name || obj.name === '.emptyFolderPlaceholder') continue
    const parsed = parseFileIdFromStorageName(obj.name)
    if (!parsed) continue
    const meta = byFileId.get(parsed.fileId)
    const fileName = meta?.fileName || parsed.fileName
    const mimeType = meta?.mimeType || String(obj.metadata?.mimetype ?? 'application/octet-stream')
    const sizeBytes = meta?.sizeBytes || Number(obj.metadata?.size ?? 0)
    files.push({
      id: parsed.fileId,
      fileName,
      label: meta?.label || fileName,
      category: classifyProjectFileCategory(fileName, mimeType),
      mimeType,
      sizeBytes,
      uploadedBy: meta?.uploadedBy ?? null,
      uploaderName: meta?.uploaderName ?? 'Team member',
      note: meta?.note ?? '',
      createdAt: meta?.createdAt || String(obj.created_at ?? new Date().toISOString()),
    })
  }

  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return files
}

/** Upload a project shared file into private Storage and log attribution metadata. */
export async function uploadProjectSharedFile(input: {
  projectId: string
  file: File
  label?: string
  note?: string
  uploadedBy: string
  uploaderName: string
}): Promise<ProjectSharedFile> {
  validateProjectFileCandidate({ name: input.file.name, size: input.file.size, type: input.file.type })
  const admin = await ensureProjectFilesBucket()

  const fileId = crypto.randomUUID()
  const safeName = sanitizeProjectFileName(input.file.name)
  const objectPath = `${input.projectId}/files/${fileId}--${safeName}`
  const bytes = await input.file.arrayBuffer()
  const mimeType = input.file.type?.trim() || 'application/octet-stream'

  const { error: uploadError } = await admin.storage
    .from(PROJECT_FILE_BUCKET)
    .upload(objectPath, bytes, { contentType: mimeType, upsert: false })
  if (uploadError) throw new Error(`PROJECT_FILE_UPLOAD_FAILED:${uploadError.message}`)

  const createdAt = new Date().toISOString()
  const cleanLabel = input.label?.trim().slice(0, 120) || safeName
  const cleanNote = input.note?.trim().slice(0, 400) || ''
  const snapshot: StoredFileSnapshot = {
    fileId,
    objectPath,
    fileName: safeName,
    label: cleanLabel,
    mimeType,
    sizeBytes: input.file.size,
    uploadedBy: input.uploadedBy,
    uploaderName: input.uploaderName.trim() || 'Team member',
    note: cleanNote,
    createdAt,
  }

  await admin.from('audit_log').insert({
    actor_id: input.uploadedBy,
    action: 'PROJECT_FILE_UPLOADED',
    entity_type: 'project_shared_file',
    entity_id: input.projectId,
    after_snapshot: snapshot,
  })

  return {
    id: fileId,
    fileName: safeName,
    label: cleanLabel,
    category: classifyProjectFileCategory(safeName, mimeType),
    mimeType,
    sizeBytes: input.file.size,
    uploadedBy: input.uploadedBy,
    uploaderName: snapshot.uploaderName,
    note: cleanNote,
    createdAt,
  }
}

/** Generate a short-lived signed download URL for an authorized member/admin. */
export async function createProjectFileDownloadUrl(projectId: string, fileId: string): Promise<string> {
  const admin = await ensureProjectFilesBucket()
  const folder = `${projectId}/files`
  const { data: objects, error } = await admin.storage.from(PROJECT_FILE_BUCKET).list(folder, { limit: 100 })
  if (error) throw new Error(`PROJECT_FILE_DOWNLOAD_FAILED:${error.message}`)

  const target = (objects ?? []).find(obj => obj.name.startsWith(`${fileId}--`))
  if (!target) throw new Error('PROJECT_FILE_NOT_FOUND')
  const parsed = parseFileIdFromStorageName(target.name)

  const { data: signed, error: signError } = await admin.storage
    .from(PROJECT_FILE_BUCKET)
    .createSignedUrl(`${folder}/${target.name}`, 120, {
      download: parsed?.fileName ?? true,
    })
  if (signError || !signed?.signedUrl) {
    throw new Error(`PROJECT_FILE_DOWNLOAD_FAILED:${signError?.message ?? 'MISSING_URL'}`)
  }
  return signed.signedUrl
}

/** Permanently remove a project shared file when deleted by the uploader, a lead, or an admin. */
export async function deleteProjectSharedFile(input: {
  projectId: string
  fileId: string
  actorId: string
  canDeleteAny: boolean
}) {
  const files = await listProjectSharedFiles(input.projectId)
  const target = files.find(item => item.id === input.fileId)
  if (!target) throw new Error('PROJECT_FILE_NOT_FOUND')
  if (!input.canDeleteAny && target.uploadedBy !== input.actorId) {
    throw new Error('PROJECT_FILE_DELETE_FORBIDDEN')
  }

  const admin = await ensureProjectFilesBucket()
  const objectPath = `${input.projectId}/files/${target.id}--${target.fileName}`
  const { error } = await admin.storage.from(PROJECT_FILE_BUCKET).remove([objectPath])
  if (error) throw new Error(`PROJECT_FILE_DELETE_FAILED:${error.message}`)

  await admin.from('audit_log').insert({
    actor_id: input.actorId,
    action: 'PROJECT_FILE_DELETED',
    entity_type: 'project_shared_file',
    entity_id: input.projectId,
    before_snapshot: target,
  })
}
