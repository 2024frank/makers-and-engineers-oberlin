import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'
import { listPublishedProjects } from '@/lib/content/projects'
import { searchMemberDirectory } from '@/lib/members/directory'

/** One club team. Leads also get the members they can invite and the recruiting projects they can pick, as on the web team page. */
export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const { teamId } = await params
  if (!z.string().uuid().safeParse(teamId).success) return NextResponse.json({ error: 'TEAM_NOT_FOUND' }, { status: 404 })
  const [team] = await listClubTeams(teamId)
  if (!team) return NextResponse.json({ error: 'TEAM_NOT_FOUND' }, { status: 404 })
  const lead = team.myRole === 'LEAD'
  const [members, projects] = await Promise.all([lead ? searchMemberDirectory() : Promise.resolve([]), lead ? listPublishedProjects() : Promise.resolve([])])
  return NextResponse.json({ team, members, projects: projects.filter(project => project.recruiting).map(project => ({ id: project.id, title: project.title })) })
}
