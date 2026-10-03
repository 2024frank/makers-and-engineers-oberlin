import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMyProjectOverview } from '@/lib/projects/workspace'
import { listClubTeams } from '@/lib/teams/server'

/** My teams: my project overview and the club teams I am on, as on the web My teams page. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const [projects, teams] = await Promise.all([listMyProjectOverview(), listClubTeams()])
  return NextResponse.json({ projects, myTeams: teams.filter(team => team.myRole) })
}
