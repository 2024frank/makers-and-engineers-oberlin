import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getMemberDashboardSummary } from '@/lib/members/dashboard'
import { listMyProjectOverview, listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { getMemberWork } from '@/lib/projects/memberActivity'
import { listClubInvitations, listClubTeams } from '@/lib/teams/server'

/** Everything the member dashboard shows, from the same loaders as the web page. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const [summary, teams, clubTeams, invitations, progress] = await Promise.all([getMemberDashboardSummary(member.userId), listMyProjectWorkspaces(), listClubTeams(), listClubInvitations(), listMyProjectOverview()])
  const work = await getMemberWork(member.userId, progress)
  return NextResponse.json({
    displayName: member.displayName,
    summary: { ...summary, pendingInvitations: summary.pendingInvitations + invitations.filter(invitation => invitation.status === 'PENDING').length },
    teams,
    clubTeams: clubTeams.filter(team => team.myRole).map(team => ({ id: team.id, name: team.name, memberCount: team.roster.length })),
    progress,
    work,
  })
}
