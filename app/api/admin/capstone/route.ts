import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { capstoneAction, capstoneError } from '@/lib/capstone/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null) as { userId?: unknown } | null
  if (typeof body?.userId !== 'string' || !UUID.test(body.userId)) return NextResponse.json({ error: 'Check the application and try again.' }, { status: 400 })
  try { await capstoneAction('review', body.userId); return NextResponse.json({ ok: true }) }
  catch (error) { return NextResponse.json({ error: capstoneError(error) }, { status: 400 }) }
}
