import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { addProjectWorkLog, deleteProjectWorkLog } from '@/lib/projects/workLogs'
import { publicWorkspaceError } from '@/lib/projects/workspaceInput'

type Params = { params: Promise<{ projectId: string }> }
const uuid = z.string().uuid()
const fail = (error: unknown) => NextResponse.json({ error: publicWorkspaceError(error instanceof Error ? error.message : '') }, { status: 400 })

export async function POST(request: Request, { params }: Params) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const projectId = (await params).projectId
  const form = await request.formData().catch(() => null)
  if (!uuid.safeParse(projectId).success || !form) return NextResponse.json({ error: 'WORKSPACE_ACTION_INVALID' }, { status: 400 })
  const body = String(form.get('body') ?? '')
  const files = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0)
  if (body.length > 4000) return NextResponse.json({ error: 'WORK_LOG_TOO_LONG' }, { status: 400 })
  try { return NextResponse.json({ ok: true, result: await addProjectWorkLog(projectId, member.userId, body, files) }, { status: 201 }) }
  catch (error) { return fail(error) }
}

export async function DELETE(request: Request, { params }: Params) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const logId = new URL(request.url).searchParams.get('id') ?? ''
  if (!uuid.safeParse((await params).projectId).success || !uuid.safeParse(logId).success) return NextResponse.json({ error: 'WORKSPACE_ACTION_INVALID' }, { status: 400 })
  try { await deleteProjectWorkLog(logId); return NextResponse.json({ ok: true }) }
  catch (error) { return fail(error) }
}
