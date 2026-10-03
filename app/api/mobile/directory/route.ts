import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { filterDirectoryMembers, searchMemberDirectory } from '@/lib/members/directory'
import { listClubTeams, listProjectRosters } from '@/lib/teams/server'

const uniq = (values: (string | undefined)[]) => Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))
const uniqList = (values: (string[] | undefined)[]) => uniq(values.flatMap(value => value ?? []))

/** The member directory, as on the web page. Query: q, discipline, skill, major, year, interest, availability. */
export async function GET(request: Request) {
  const current = await getCurrentMember()
  if (!current) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const one = (key: string) => params.get(key) ?? ''
  const [safeMembers, teams, projects] = await Promise.all([searchMemberDirectory(one('q')), listClubTeams(), listProjectRosters()])
  const members = filterDirectoryMembers(safeMembers, { discipline: one('discipline'), skill: one('skill'), major: one('major'), classYear: one('year'), interest: one('interest'), availability: one('availability') })
  const options = {
    disciplines: uniqList(safeMembers.map(m => m.disciplines)), skills: uniqList(safeMembers.map(m => m.skills)), majors: uniq(safeMembers.map(m => m.major)),
    classYears: Array.from(new Set(safeMembers.map(m => m.classYear).filter((v): v is number => typeof v === 'number'))).sort((a, b) => a - b), interests: uniqList(safeMembers.map(m => m.projectInterests)),
  }
  return NextResponse.json({
    currentUserId: current.userId, options,
    members: members.map(member => ({
      ...member,
      joinedTeams: teams.filter(team => team.roster.some(person => person.userId === member.userId)).map(team => ({ id: team.id, name: team.name })),
      joinedProjects: projects.filter(project => project.members.some(person => person.userId === member.userId)).map(project => ({ projectId: project.projectId, title: project.title })),
      invitableTeams: teams.filter(team => team.myRole === 'LEAD' && !team.roster.some(person => person.userId === member.userId)).map(team => ({ id: team.id, name: team.name })),
    })),
  })
}
