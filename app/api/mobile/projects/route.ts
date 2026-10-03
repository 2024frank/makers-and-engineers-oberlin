import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listPublishedProjects } from '@/lib/content/projects'
import { getProjectTeamStats } from '@/lib/content/projectTeamStats'
import { listMyProjectApplications } from '@/lib/projects/applications'
import { listMyProjectWorkspaces } from '@/lib/projects/workspace'
import { listProjectRosters } from '@/lib/teams/server'
import { toMobileProjects } from './shape'

/** Everything the web "Find a project" page shows: published projects, my applications, my teams, rosters and team stats. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try {
    const [projects, applications, teams, rosters] = await Promise.all([listPublishedProjects(), listMyProjectApplications(member.userId), listMyProjectWorkspaces(), listProjectRosters()])
    const stats = await getProjectTeamStats(projects.map(project => project.id))
    return NextResponse.json({ projects: await toMobileProjects(projects), applications: applications.map(application => ({ projectId: application.projectId, status: application.status })), teamIds: teams.map(team => team.projectId), rosters, stats })
  } catch { return NextResponse.json({ error: 'PROJECTS_LOAD_FAILED' }, { status: 500 }) }
}
