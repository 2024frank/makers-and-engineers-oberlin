import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMyTeamInvites } from '@/lib/projects/teamInvites'
import { listClubInvitations } from '@/lib/teams/server'

/** Project invitations and club team invitations, as on the web Invitations page. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try {
    const [projects, teams] = await Promise.all([listMyTeamInvites(member.userId), listClubInvitations()])
    return NextResponse.json({ projects, teams })
  } catch { return NextResponse.json({ error: 'INVITATIONS_LOAD_FAILED' }, { status: 500 }) }
}
