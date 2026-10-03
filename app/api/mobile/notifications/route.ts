import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMemberNotifications } from '@/lib/notifications/service'

/** The member's notifications, newest first. Marking read uses PUT /api/member/notifications. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  return NextResponse.json({ notifications: await listMemberNotifications() })
}
