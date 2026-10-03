import 'server-only'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const BUCKET = 'team-workspace'
export const WORK_LOG_MAX_PHOTOS = 6
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const SIGNED_URL_SECONDS = 60 * 60

export type WorkLogPhoto = { path: string; url: string }
export type WorkLog = { id: string; authorUserId: string; authorName: string; body: string; createdAt: string; photos: WorkLogPhoto[] }

/** Every workspace entry on a project, newest first. Row level security limits this to the team and officers. */
export async function listProjectWorkLogs(projectId: string): Promise<WorkLog[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.from('project_work_logs').select('id,author_user_id,author_name,body,photo_paths,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(300)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const paths = rows.flatMap(row => (row.photo_paths as string[]) ?? [])
  const urls = new Map<string, string>()
  if (paths.length) {
    const { data: signed } = await s.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
    for (const item of signed ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return rows.map(row => ({
    id: row.id as string, authorUserId: row.author_user_id as string, authorName: row.author_name as string, body: row.body as string, createdAt: row.created_at as string,
    photos: ((row.photo_paths as string[]) ?? []).filter(path => urls.has(path)).map(path => ({ path, url: urls.get(path)! })),
  }))
}

/** Re-encode an upload as a JPEG no larger than 1600px. This also drops EXIF data such as GPS location. */
async function normalizePhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('WORK_LOG_PHOTO_INVALID')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('WORK_LOG_PHOTO_TOO_LARGE')
  try { return await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer() }
  catch { throw new Error('WORK_LOG_PHOTO_INVALID') }
}

export async function addProjectWorkLog(projectId: string, userId: string, body: string, files: File[]) {
  if (files.length > WORK_LOG_MAX_PHOTOS) throw new Error('WORK_LOG_TOO_MANY_PHOTOS')
  if (body.trim().length < 2 && !files.length) throw new Error('WORK_LOG_REQUIRED')
  const s = await createSupabaseServerClient()
  const images = await Promise.all(files.map(normalizePhoto))
  const paths: string[] = []
  try {
    for (const image of images) {
      const path = `${projectId}/${userId}/${randomUUID()}.jpg`
      const { error } = await s.storage.from(BUCKET).upload(path, image, { contentType: 'image/jpeg', upsert: false })
      if (error) throw new Error(/row-level security|not authorized|unauthorized/i.test(error.message) ? 'PROJECT_MEMBER_REQUIRED' : 'WORK_LOG_UPLOAD_FAILED')
      paths.push(path)
    }
    const { data, error } = await s.rpc('add_project_work_log', { p_project_id: projectId, p_body: body, p_photo_paths: paths })
    if (error) throw new Error(error.message)
    return data as { id: string }
  } catch (error) {
    if (paths.length) await s.storage.from(BUCKET).remove(paths).catch(() => null)
    throw error
  }
}

export async function deleteProjectWorkLog(logId: string) {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('delete_project_work_log', { p_log_id: logId })
  if (error) throw new Error(error.message)
  const paths = (data as string[] | null) ?? []
  if (paths.length) await s.storage.from(BUCKET).remove(paths).catch(() => null)
}
