import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OfficerAction } from './input'
import type { OfficerPosition, OfficerApplication, OfficerEmailStatus } from './types'

// The three list functions return JSON. The shapes they build are declared in ./types.

export async function listOfficerPositions(): Promise<OfficerPosition[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return []
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_officer_positions')
  if (error) throw new Error('Could not load open positions. Please try again.')
  return (data ?? []) as OfficerPosition[]
}
export async function listOfficerApplications(): Promise<OfficerApplication[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_officer_applications')
  if (error) throw new Error('Could not load officer applications. Please try again.')
  return (data ?? []) as OfficerApplication[]
}
export async function listOfficerEmailStatus(): Promise<OfficerEmailStatus[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('officer_email_status')
  if (error) throw new Error('Could not load announcement delivery status.')
  return (data ?? []) as OfficerEmailStatus[]
}
export async function performOfficerAction(input: OfficerAction) {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('officer_application_action', {
    p_action: input.action, p_position_id: input.positionId,
    ...(input.action === 'apply' ? { p_statement: input.statement, p_experience: input.experience } : {}),
    ...(input.action === 'review' ? { p_user_id: input.userId, p_decision: input.decision, p_feedback: input.feedback } : {}),
  })
  if (error) throw new Error(error.message)
  return data
}
