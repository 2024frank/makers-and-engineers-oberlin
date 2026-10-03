import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'

/** My applications plus the ids of the teams I am on, which decides who gets an "Open my team" link. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try {
    const [applications, teams] = await Promise.all([listMyProjectApplications(member.userId), listMyProjectWorkspaces()])
    return NextResponse.json({ applications, teamIds: teams.map(team => team.projectId) })
  } catch { return NextResponse.json({ error: 'APPLICATIONS_LOAD_FAILED' }, { status: 500 }) }
}
