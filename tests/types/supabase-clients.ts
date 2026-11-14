// Compile-time checks. `npm run typecheck` reads this file; nothing in it ever runs.
//
// The three Supabase clients are typed from lib/supabase/database.ts. If that type stopped
// reaching a client, for example after a supabase-js upgrade, every query result would
// quietly become `any` again and the compiler would stop checking names. Each
// `@ts-expect-error` below has to find an error on the line after it, or the typecheck
// fails, so that cannot happen unnoticed.
import type { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { createSupabaseServerClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type BrowserClient = ReturnType<typeof createSupabaseBrowserClient>

export async function tableNamesAreChecked(admin: AdminClient, server: ServerClient, browser: BrowserClient) {
  // @ts-expect-error no migration creates this table
  admin.from('no_such_table')
  // @ts-expect-error no migration creates this table
  server.from('no_such_table')
  // @ts-expect-error no migration creates this table
  browser.from('no_such_table')
}

export async function columnNamesAreChecked(admin: AdminClient) {
  // @ts-expect-error projects has no such column to filter on
  admin.from('projects').select('id').eq('no_such_column', 'x')
  // @ts-expect-error projects has no such column to write
  admin.from('projects').insert({ slug: 'a', title: 'A', no_such_column: 1 })

  const { data: bad } = await admin.from('projects').select('id,no_such_column').single()
  // @ts-expect-error a select list with an unknown column has no readable fields
  return bad?.id
}

export async function rowsAreTyped(admin: AdminClient) {
  const { data: project } = await admin.from('projects').select('id,title,cover_media_id').single()
  // @ts-expect-error title is text, so it is not a number
  const title: number | undefined = project?.title
  // @ts-expect-error cover_media_id is nullable, so it is not always a string
  const cover: string | undefined = project?.cover_media_id

  // role_assignments.user_id is its primary key and its foreign key to admin_profiles, so
  // the embed is one object or null, not a list.
  const { data: profile } = await admin.from('admin_profiles').select('user_id,role_assignments(role)').single()
  const role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | undefined = profile?.role_assignments?.role
  // @ts-expect-error a one-to-one embed is not an array
  const count: number | undefined = profile?.role_assignments?.length
  return { title, cover, role, count }
}

export async function functionsAreChecked(admin: AdminClient) {
  // @ts-expect-error no migration creates this function
  admin.rpc('no_such_function')
  // @ts-expect-error activate_member takes p_user_id
  admin.rpc('activate_member', { p_user: '00000000-0000-4000-8000-000000000001' })
  // @ts-expect-error p_user_id is a uuid, sent as a string
  admin.rpc('activate_member', { p_user_id: 1 })
  // Postgres accepts NULL for any argument, and lib/supabase/database.ts says so.
  admin.rpc('reject_membership_request', { p_request_id: 'a', p_reviewer_id: 'b', p_review_note: null })

  const { data: workspaces } = await admin.rpc('list_my_project_workspaces')
  // @ts-expect-error the function returns rows whose title is text
  const title: number | undefined = workspaces?.[0]?.title
  const { data: removed } = await admin.rpc('delete_project_milestone', { p_milestone_id: 'a' })
  // @ts-expect-error the function returns a boolean
  const text: string | null = removed
  return { title, text }
}
