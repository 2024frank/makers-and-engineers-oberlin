import { NextResponse } from 'next/server'
import { getCurrentAdmin, type CurrentAdmin } from '@/lib/auth/session'
import { can } from '@/lib/permissions/can'
import { getAdminEmailConsoleData, sendAdminBroadcast } from '@/lib/email/adminBroadcast'

export const maxDuration = 60

// The composer calls this route with fetch(). requireAdmin() would answer a missing session
// with a redirect to the login page, which fetch follows as a POST and gets an HTML 405 back,
// so the officer only saw "Email send failed." A JSON 401 lets the composer say what happened.
type OfficerCheck = { ok: true; admin: CurrentAdmin } | { ok: false; response: NextResponse }

async function officerWhoCanSendEmail(): Promise<OfficerCheck> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, response: NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 }) }
  if (!can(admin.role, 'SEND_EMAIL')) return { ok: false, response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  return { ok: true, admin }
}

export async function GET() {
  const auth = await officerWhoCanSendEmail()
  if (!auth.ok) return auth.response
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
  const auth = await officerWhoCanSendEmail()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const result = await sendAdminBroadcast(auth.admin, body, new URL(request.url).origin)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED' },
      { status: 400 },
    )
  }
}
