import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'

/** Every club team, as on the web Find a team page. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  return NextResponse.json({ teams: await listClubTeams() })
}
