import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getProjectWorkspace } from '@/lib/projects/workspace'
import {
  createProjectFileDownloadUrl,
  deleteProjectSharedFile,
  listProjectSharedFiles,
  uploadProjectSharedFile,
} from '@/lib/projects/teamFiles'

type Params = { params: Promise<{ projectId: string }> }
const uuid = z.string().uuid()

async function resolveProjectActor(projectId: string) {
  const [admin, member] = await Promise.all([getCurrentAdmin().catch(() => null), getCurrentMember().catch(() => null)])
  if (admin && admin.active && (admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN')) {
    return {
      userId: admin.userId,
      displayName: admin.displayName || 'Officer',
      canDeleteAny: true,
    }
  }
  if (!member) return null
  try {
    const workspace = await getProjectWorkspace(projectId)
    return {
      userId: member.userId,
      displayName: member.displayName,
      canDeleteAny: workspace.myRole === 'LEAD',
    }
  } catch {
    return null
  }
}

export async function GET(request: Request, { params }: Params) {
  const { projectId } = await params
  if (!uuid.safeParse(projectId).success) {
    return NextResponse.json({ error: 'INVALID_PROJECT' }, { status: 400 })
  }
  const actor = await resolveProjectActor(projectId)
  if (!actor) return NextResponse.json({ error: 'PROJECT_ACCESS_REQUIRED' }, { status: 403 })

  const downloadId = new URL(request.url).searchParams.get('download')
  if (downloadId) {
    if (!uuid.safeParse(downloadId).success) {
      return NextResponse.json({ error: 'PROJECT_FILE_NOT_FOUND' }, { status: 404 })
    }
    try {
      const signedUrl = await createProjectFileDownloadUrl(projectId, downloadId)
      return NextResponse.redirect(signedUrl, 307)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'PROJECT_FILE_DOWNLOAD_FAILED' },
        { status: 404 },
      )
    }
  }

  try {
    const files = await listProjectSharedFiles(projectId)
    return NextResponse.json({ files })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PROJECT_FILES_LIST_FAILED' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  if (!uuid.safeParse(projectId).success) {
    return NextResponse.json({ error: 'INVALID_PROJECT' }, { status: 400 })
  }
  const actor = await resolveProjectActor(projectId)
  if (!actor) return NextResponse.json({ error: 'PROJECT_ACCESS_REQUIRED' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PROJECT_FILE_REQUIRED' }, { status: 400 })
  }

  try {
    const uploaded = await uploadProjectSharedFile({
      projectId,
      file,
      label: typeof form?.get('label') === 'string' ? String(form.get('label')) : undefined,
      note: typeof form?.get('note') === 'string' ? String(form.get('note')) : undefined,
      uploadedBy: actor.userId,
      uploaderName: actor.displayName,
    })
    return NextResponse.json({ ok: true, file: uploaded }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PROJECT_FILE_UPLOAD_FAILED' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { projectId } = await params
  const fileId = new URL(request.url).searchParams.get('fileId') ?? ''
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(fileId).success) {
    return NextResponse.json({ error: 'INVALID_PROJECT_FILE' }, { status: 400 })
  }
  const actor = await resolveProjectActor(projectId)
  if (!actor) return NextResponse.json({ error: 'PROJECT_ACCESS_REQUIRED' }, { status: 403 })

  try {
    await deleteProjectSharedFile({
      projectId,
      fileId,
      actorId: actor.userId,
      canDeleteAny: actor.canDeleteAny,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROJECT_FILE_DELETE_FAILED'
    return NextResponse.json({ error: code }, { status: code === 'PROJECT_FILE_DELETE_FORBIDDEN' ? 403 : 400 })
  }
}
