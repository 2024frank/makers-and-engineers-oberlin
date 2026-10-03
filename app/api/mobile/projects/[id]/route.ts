import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listPublishedProjects } from '@/lib/content/projects'
import { getProjectTeamStats } from '@/lib/content/projectTeamStats'
import { getApplicationTarget, listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { isSavedItem } from '@/lib/members/saves'
import { listProjectRosters } from '@/lib/teams/server'
import { toMobileProjects } from '../shape'

/** One published project with the same state the web page works out: roster, stats, my latest application, whether I am on the team, whether I can apply, whether I saved it. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const { id } = await params
  try {
    const projects = await listPublishedProjects()
    const found = projects.find(project => project.id === id)
    if (!found) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 })
    const [[project], applications, teams, rosters, stats, target, saved] = await Promise.all([toMobileProjects([found]), listMyProjectApplications(member.userId), listMyProjectWorkspaces(), listProjectRosters(), getProjectTeamStats([id]), getApplicationTarget(id), isSavedItem(member.userId, 'PROJECT', id).catch(() => false)])
    const latest = applications.find(application => application.projectId === id) ?? null
    const onTeam = teams.some(team => team.projectId === id)
    // Only an open application, or a team you are still on, blocks a new application.
    const canApply = Boolean(target) && !onTeam && latest?.status !== 'PENDING'
    return NextResponse.json({ project, stats: stats[id] ?? null, roster: rosters.find(roster => roster.projectId === id)?.members ?? [], application: latest ? { id: latest.id, status: latest.status } : null, onTeam, canApply, saved })
  } catch { return NextResponse.json({ error: 'PROJECT_LOAD_FAILED' }, { status: 500 }) }
}
