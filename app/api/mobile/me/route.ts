import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getUnreadNotificationCount } from '@/lib/members/dashboard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** The signed-in member, for the phone app. 401 when the account is not an active member, 503 when that could not be checked. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) {
    // A database or network failure also yields no member. Tell the app to retry instead of calling the account inactive.
    const { error } = await (await createSupabaseServerClient()).auth.getUser()
    const outage = Boolean(error && (!error.status || error.status >= 500))
    return NextResponse.json({ error: outage ? 'SERVICE_UNAVAILABLE' : 'ACTIVE_MEMBER_REQUIRED' }, { status: outage ? 503 : 401 })
  }
  const unreadNotifications = await getUnreadNotificationCount(member.userId).catch(() => 0)
  return NextResponse.json({ member, unreadNotifications })
}
