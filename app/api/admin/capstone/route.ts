import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { capstoneAction, capstoneError, listCapstoneApplications } from '@/lib/capstone/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { userId?: unknown; submittedAt?: unknown } | null
  if (typeof body?.userId !== 'string' || !UUID.test(body.userId) || typeof body.submittedAt !== 'string') return NextResponse.json({ error: 'Check the application and try again.' }, { status: 400 })
  const { userId, submittedAt } = body
  try {
    const current = (await listCapstoneApplications()).find(item => item.userId === userId)
    if (!current || current.submittedAt !== submittedAt) return NextResponse.json({ error: 'This application changed. Reload to see the new version.' }, { status: 409 })
    await capstoneAction('review', userId); return NextResponse.json({ ok: true })
  }
  catch (error) { return NextResponse.json({ error: capstoneError(error) }, { status: 400 }) }
}
