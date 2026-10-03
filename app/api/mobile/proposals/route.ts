import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMyProjectProposals } from '@/lib/projects/proposalServer'
import { listClubTeams } from '@/lib/teams/server'

/** My proposals, and the club teams I lead (a proposal can be made for one of them). */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try {
    const [proposals, teams] = await Promise.all([listMyProjectProposals(member.userId), listClubTeams()])
    return NextResponse.json({ proposals, teams: teams.filter(team => team.myRole === 'LEAD').map(team => ({ id: team.id, name: team.name })) })
  } catch { return NextResponse.json({ error: 'PROPOSALS_LOAD_FAILED' }, { status: 500 }) }
}
