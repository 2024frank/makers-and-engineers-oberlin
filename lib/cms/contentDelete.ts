import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { deletableContentTypes, type DeletableContentType } from './contentDeleteMessages'

export function isDeletableContentType(value: unknown): value is DeletableContentType {
  return typeof value === 'string' && (deletableContentTypes as readonly string[]).includes(value)
}

// Permanent delete through the database function, which re-checks the Admin role, cleans up
// drafts, versions and saves, blocks officer positions that have history, and writes the audit row.
export async function deleteContentEntity(entityType: DeletableContentType, entityId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('delete_content_entity', { p_entity_type: entityType, p_entity_id: entityId })
  if (error) throw new Error(error.message)
  return data as { entityType: string; id: string; title: string }
}
