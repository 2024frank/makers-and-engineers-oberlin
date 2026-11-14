import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database'
import type { ClubTeam, ClubInvitation, ProjectRoster } from './types'
import type { TeamAction } from './input'

// These database functions return JSON. The shapes they build are declared in ./types and below.
type TeamActionResult = { teamId: string; status: string | null }
type DeletedTeam = { teamId: string; name: string; notifiedMembers: number }

export async function listClubTeams(teamId?: string): Promise<ClubTeam[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_club_teams', { p_team_id: teamId ?? null })
  if (error) throw new Error(error.message)
  return (data ?? []) as ClubTeam[]
}
export async function listClubInvitations(): Promise<ClubInvitation[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_my_club_team_invitations')
  if (error) throw new Error(error.message)
  return (data ?? []) as ClubInvitation[]
}
export async function listProjectRosters(): Promise<ProjectRoster[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('community_project_rosters')
  if (error) throw new Error(error.message)
  return (data ?? []) as ProjectRoster[]
}
export async function performTeamAction(input: TeamAction): Promise<TeamActionResult> {
  const { action, ...fields } = input
  const { teamId, ...payload } = fields as { teamId?: string } & Record<string, Json | undefined>
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('club_team_action', { p_action: action, p_team_id: teamId ?? null, p_payload: payload })
  if (error) throw new Error(error.message)
  return data as TeamActionResult
}
export async function deleteClubTeam(teamId: string, confirmName: string): Promise<DeletedTeam> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('admin_delete_club_team', { p_team_id: teamId, p_confirm_name: confirmName })
  if (error) throw new Error(error.message)
  return data as DeletedTeam
}
