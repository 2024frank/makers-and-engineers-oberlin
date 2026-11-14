// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

// A stand-in for the service-role client that, like PostgREST, rejects a select naming a
// column the table does not have. The Applicants audience used to ask membership_requests
// for `oberlin_email`, which only member_profiles has, so it always came back empty.
const COLUMNS: Record<string, string[]> = {
  member_profiles: ['user_id', 'display_name', 'oberlin_email', 'disciplines', 'status'],
  admin_users: ['user_id', 'display_name', 'email', 'role', 'active'],
  membership_requests: ['id', 'display_name', 'email', 'status', 'created_at'],
  projects: ['id', 'title', 'publication_state'],
  project_memberships: ['project_id', 'user_id', 'role', 'status'],
  club_teams: ['id', 'name'],
  club_team_memberships: ['team_id', 'user_id', 'status'],
  audit_log: ['id', 'created_at', 'after_snapshot', 'action'],
}
const ROWS: Record<string, Record<string, unknown>[]> = {
  membership_requests: [
    { id: 'r1', display_name: 'Chloe Zhang', email: 'czhang21@oberlin.edu', status: 'REQUESTED' },
    { id: 'r2', display_name: '', email: 'kejedepa@oberlin.edu', status: 'REQUESTED' },
  ],
}
const { send, sendBatch } = vi.hoisted(() => ({ send: vi.fn(), sendBatch: vi.fn() }))

function query(table: string) {
  let result: { data: unknown; error: { message: string } | null } = { data: ROWS[table] ?? [], error: null }
  const builder = {
    select(columns: string) {
      const unknown = columns.split(',').map(column => column.trim()).filter(column => !COLUMNS[table]?.includes(column))
      if (unknown.length) result = { data: null, error: { message: `column ${table}.${unknown[0]} does not exist` } }
      return builder
    },
    eq: () => builder, neq: () => builder, in: () => builder, order: () => builder, limit: () => builder,
    insert: () => builder,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return builder
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: query }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: send, sendTransactionalEmailBatch: sendBatch }))

import { getAdminEmailConsoleData, sendAdminBroadcast } from '@/lib/email/adminBroadcast'

const officer = { userId: 'u1', email: 'officer@oberlin.edu', displayName: 'Officer' }
afterEach(() => vi.resetAllMocks())

describe('emailing pending membership applicants', () => {
  it('counts the pending requests on the email page', async () => {
    const data = await getAdminEmailConsoleData()
    expect(data.groups.counts.pendingApplicants).toBe(2)
  })

  it('sends to every pending request address', async () => {
    sendBatch.mockResolvedValue(2)
    const result = await sendAdminBroadcast(officer, { audience: 'pending_applicants', subject: 'Finish joining', body: 'Verify your email to finish joining.' })
    expect(result).toMatchObject({ recipientCount: 2, sentCount: 2, audienceLabel: 'Pending membership requests' })
    const messages = sendBatch.mock.calls[0][0].messages as Array<{ to: string; message: { text: string } }>
    expect(messages.map(message => message.to)).toEqual(['czhang21@oberlin.edu', 'kejedepa@oberlin.edu'])
    expect(messages[0].message.text).toContain('Hi Chloe Zhang,')
  })
})
