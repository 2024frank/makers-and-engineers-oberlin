import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { getAdminEmailConsoleData, sendAdminBroadcast } from '@/lib/email/adminBroadcast'

export const maxDuration = 60

export async function GET() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'SEND_EMAIL')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    return NextResponse.json(await getAdminEmailConsoleData())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'EMAIL_CONSOLE_LOAD_FAILED' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'SEND_EMAIL')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    const result = await sendAdminBroadcast(admin, body, new URL(request.url).origin)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED' },
      { status: 400 },
    )
  }
}
