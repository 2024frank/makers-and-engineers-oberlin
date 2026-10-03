import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listClubTeams } from '@/lib/teams/server'
import { searchMemberDirectory } from '@/lib/members/directory'
import { listProjectApplications } from '@/lib/projects/applications'
import { getProjectWorkspace } from '@/lib/projects/workspace'
import { listProjectWorkLogs } from '@/lib/projects/workLogs'

/** Everything the web team workspace page loads, for the phone app. 404 when the caller is not on the project team. */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const { projectId } = await params
  if (!z.string().uuid().safeParse(projectId).success) return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 })
  let workspace
  try { workspace = await getProjectWorkspace(projectId) }
  catch (error) {
    if (error instanceof Error && ['PROJECT_WORKSPACE_FORBIDDEN', 'PROJECT_NOT_FOUND'].includes(error.message)) return NextResponse.json({ error: 'PROJECT_WORKSPACE_FORBIDDEN' }, { status: 404 })
    throw error
  }
  const isLead = workspace.myRole === 'LEAD'
  const [[clubTeams, applications, directory], workLogs] = await Promise.all([
    isLead ? Promise.all([listClubTeams(), listProjectApplications(projectId), searchMemberDirectory('')]) : Promise.resolve([[], [], []] as const),
    listProjectWorkLogs(projectId).catch(() => []),
  ])
  const teamRequests = clubTeams.flatMap(team => team.projects
    .filter(project => project.status === 'PENDING' && project.canReview && project.id === projectId)
    .map(project => ({ teamId: team.id, teamName: team.name, projectId: project.id, projectTitle: project.title, roster: team.roster })))
  return NextResponse.json({
    me: member.userId,
    isLead,
    started: Boolean(workspace.project.startedAt),
    workspace,
    workLogs,
    applications,
    teamRequests,
    directory: directory.map(person => ({ userId: person.userId, displayName: person.displayName ?? '', major: person.major ?? null, skills: person.skills ?? [] })),
  })
}
