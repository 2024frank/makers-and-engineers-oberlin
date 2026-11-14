// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransactionalEmailMessage } from '@/lib/email/templates'

type Row = Record<string, unknown>
type Sent = { to: string; message: TransactionalEmailMessage }

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failing: new Set<string>(),
  inserts: {} as Record<string, unknown[]>,
  single: vi.fn(),
  batch: vi.fn(),
}))

// A small stand-in for the Supabase query builder that really applies the filters, so
// the tests exercise the same audience queries the server runs.
function query(table: string) {
  let rows = [...(state.tables[table] ?? [])]
  const error = state.failing.has(table) ? { message: `${table} unavailable` } : null
  const builder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    eq: (column: string, value: unknown) => { rows = rows.filter(row => row[column] === value); return builder },
    neq: (column: string, value: unknown) => { rows = rows.filter(row => row[column] !== value); return builder },
    in: (column: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[column])); return builder },
    contains: (column: string, values: unknown[]) => {
      rows = rows.filter(row => values.every(value => ((row[column] as unknown[] | undefined) ?? []).includes(value)))
      return builder
    },
    maybeSingle: async () => ({ data: error ? null : rows[0] ?? null, error }),
    insert: async (payload: unknown) => {
      if (error) return { error }
      ;(state.inserts[table] ??= []).push(payload)
      return { error: null }
    },
    then: (resolve: (value: { data: Row[] | null; error: { message: string } | null }) => unknown) =>
      Promise.resolve({ data: error ? null : rows, error }).then(resolve),
  }
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: query }) }))
vi.mock('@/lib/cms/media', () => ({ listMedia: async () => [] }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: state.single, sendTransactionalEmailBatch: state.batch }))
import { applyAnnouncementOptOut, sendAdminBroadcast, type BroadcastCandidate } from '@/lib/email/adminBroadcast'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const officer = { userId: id(1), email: 'officer@oberlin.edu', displayName: 'Olive Officer' }
const member = (n: number, name: string, extra: Row = {}) => ({
  user_id: id(n), display_name: name, oberlin_email: `${name.toLowerCase()}@oberlin.edu`, status: 'ACTIVE',
  disciplines: ['Robotics'], announcement_email_opt_out: false, ...extra,
})
const ADA = 10, BEN = 11, CAM = 12, DEE = 13
const message = { subject: 'Build night', body: 'Thursday at 7 in the Science Center.' }
const send = (input: Row) => sendAdminBroadcast(officer, { ...message, ...input }, 'https://admin.makeoberlin.site')

/** Everything handed to the mail client, whichever of the two send paths was used. */
function sent(): Sent[] {
  return [
    ...state.single.mock.calls.map(([call]) => ({ to: call.to as string, message: call.message as TransactionalEmailMessage })),
    ...state.batch.mock.calls.flatMap(([call]) => call.messages as Sent[]),
  ]
}
const sentTo = () => sent().map(item => item.to).sort()
const messageFor = (address: string) => sent().find(item => item.to === address)!.message
/** The member a message's unsubscribe link would opt out, read from its List-Unsubscribe header. */
function unsubscribes(email: TransactionalEmailMessage) {
  const header = email.headers?.['List-Unsubscribe']
  return header ? verifyUnsubscribeToken(new URL(header.slice(1, -1)).searchParams.get('token')) : null
}

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-signing-secret-that-is-longer-than-32-characters')
  state.tables = {
    // Ben turned off announcement email. Cam is suspended.
    member_profiles: [
      member(ADA, 'Ada'),
      member(BEN, 'Ben', { announcement_email_opt_out: true }),
      member(CAM, 'Cam', { status: 'SUSPENDED' }),
      member(DEE, 'Dee', { disciplines: ['Electrical'] }),
    ],
    project_memberships: [
      { project_id: id(50), user_id: id(ADA), role: 'LEAD', status: 'ACTIVE' },
      { project_id: id(50), user_id: id(BEN), role: 'MEMBER', status: 'ACTIVE' },
      { project_id: id(51), user_id: id(BEN), role: 'LEAD', status: 'ACTIVE' },
    ],
    projects: [{ id: id(50), title: 'Solar Cart' }],
    club_teams: [{ id: id(60), name: 'Water sensors' }],
    club_team_memberships: [{ team_id: id(60), user_id: id(BEN), status: 'ACTIVE' }, { team_id: id(60), user_id: id(DEE), status: 'ACTIVE' }],
  }
  state.failing.clear()
  state.inserts = {}
  state.single.mockReset().mockResolvedValue(true)
  state.batch.mockReset().mockImplementation(async ({ messages }: { messages: Sent[] }) => messages.length)
})
afterEach(() => { vi.unstubAllEnvs() })

describe('the opt-out rule', () => {
  const candidate = (email: string, optedOut: boolean, explicit: boolean): BroadcastCandidate =>
    ({ email, name: email, userId: null, member: true, optedOut, explicit })

  it('skips an opted-out member in a group and delivers to one the officer named', () => {
    const { recipients, skipped } = applyAnnouncementOptOut([
      candidate('in-group', false, false), candidate('out-group', true, false),
      candidate('in-named', false, true), candidate('out-named', true, true),
    ])
    expect(recipients.map(item => item.email)).toEqual(['in-group', 'in-named', 'out-named'])
    expect(skipped.map(item => item.email)).toEqual(['out-group'])
  })
})

describe('group sends', () => {
  it('leaves an opted-out member out of an everyone send and reports it', async () => {
    const result = await send({ audience: 'all_members' })
    expect(sentTo()).toEqual(['ada@oberlin.edu', 'dee@oberlin.edu'])
    expect(result).toMatchObject({ recipientCount: 2, sentCount: 2, optedOutCount: 1 })
    expect(state.inserts.audit_log).toEqual([expect.objectContaining({ after_snapshot: expect.objectContaining({ recipientCount: 2, optedOutCount: 1 }) })])
  })

  it.each([
    ['project_team', { projectId: id(50) }, ['ada@oberlin.edu']],
    ['club_team', { clubTeamId: id(60) }, ['dee@oberlin.edu']],
    ['discipline', { discipline: 'Robotics' }, ['ada@oberlin.edu']],
    ['project_leads', {}, ['ada@oberlin.edu']],
  ] as const)('leaves an opted-out member out of a %s send', async (audience, selection, expected) => {
    await send({ audience, ...selection })
    expect(sentTo()).toEqual(expected)
  })

  it('gives each recipient their own working unsubscribe link, in the headers and in the message', async () => {
    await send({ audience: 'all_members' })
    for (const [address, user] of [['ada@oberlin.edu', ADA], ['dee@oberlin.edu', DEE]] as const) {
      const email = messageFor(address)
      expect(unsubscribes(email)).toBe(id(user))
      expect(email.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
      const link = email.headers!['List-Unsubscribe'].slice(1, -1)
      expect(link.startsWith('https://www.makeoberlin.site/unsubscribe?token=')).toBe(true)
      expect(email.text).toContain(link)
      expect(email.html).toContain(link)
    }
  })

  it('still shows the announcement in the portal to a member who turned off the email', async () => {
    const result = await send({ audience: 'all_members', alsoNotifyPortal: true })
    const notified = (state.inserts.member_notifications[0] as Row[]).map(row => row.user_id).sort()
    expect(notified).toEqual([id(ADA), id(BEN), id(DEE)])
    expect(result.notifiedCount).toBe(3)
  })

  describe('when everyone in the group has opted out', () => {
    beforeEach(() => { state.tables.club_team_memberships = [{ team_id: id(60), user_id: id(BEN), status: 'ACTIVE' }] })
    const toTeam = (extra: Row = {}) => send({ audience: 'club_team', clubTeamId: id(60), ...extra })

    it('refuses an email-only send, since nothing would reach anyone', async () => {
      await expect(toTeam()).rejects.toThrow('ALL_RECIPIENTS_OPTED_OUT')
      expect(sent()).toEqual([])
      expect(state.inserts.audit_log).toBeUndefined()
    })

    it('sends no email but still posts the portal notice', async () => {
      const result = await toTeam({ alsoNotifyPortal: true })
      expect(sent()).toEqual([])
      expect(state.single).not.toHaveBeenCalled()
      expect(state.batch).not.toHaveBeenCalled()
      expect((state.inserts.member_notifications[0] as Row[]).map(row => row.user_id)).toEqual([id(BEN)])
      expect(result).toMatchObject({ recipientCount: 0, sentCount: 0, notifiedCount: 1, optedOutCount: 1 })
      expect(state.inserts.audit_log).toEqual([expect.objectContaining({ after_snapshot: expect.objectContaining({ recipientCount: 0, notifiedCount: 1, optedOutCount: 1 }) })])
    })

    it('reports a failure instead of a success when the portal notice cannot be posted either', async () => {
      state.failing.add('member_notifications')
      await expect(toTeam({ alsoNotifyPortal: true })).rejects.toThrow('PORTAL_NOTIFICATION_FAILED')
      expect(sent()).toEqual([])
      expect(state.inserts.audit_log).toBeUndefined()
    })
  })

  it('stops instead of guessing when the member lookup fails', async () => {
    state.failing.add('member_profiles')
    for (const input of [{ audience: 'all_members' }, { audience: 'project_leads' }, { audience: 'individuals', recipientUserIds: [id(BEN)] }]) {
      await expect(send(input)).rejects.toThrow('AUDIENCE_LOAD_FAILED:member_profiles unavailable')
    }
    expect(sent()).toEqual([])
  })
})

describe('messages an officer addresses directly', () => {
  it('delivers to an opted-out member the officer picked by name, without list headers', async () => {
    const result = await send({ audience: 'individuals', recipientUserIds: [id(BEN)] })
    expect(sentTo()).toEqual(['ben@oberlin.edu'])
    expect(result).toMatchObject({ audienceLabel: 'Direct: Ben', recipientCount: 1, optedOutCount: 0 })
    const email = messageFor('ben@oberlin.edu')
    expect(email).not.toHaveProperty('headers')
    expect(`${email.text}${email.html}`).not.toMatch(/unsubscribe/i)
  })

  it('delivers to every picked person, opted out or not', async () => {
    await send({ audience: 'individuals', recipientUserIds: [id(ADA), id(BEN)] })
    expect(sentTo()).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu'])
    expect(unsubscribes(messageFor('ada@oberlin.edu'))).toBe(id(ADA))
    expect(unsubscribes(messageFor('ben@oberlin.edu'))).toBeNull()
  })

  it('delivers to a typed address that belongs to an opted-out member', async () => {
    const result = await send({ audience: 'custom', customEmails: 'Ben@Oberlin.edu, guest@example.org' })
    expect(sentTo()).toEqual(['ben@oberlin.edu', 'guest@example.org'])
    expect(result.optedOutCount).toBe(0)
    for (const item of sent()) expect(item.message).not.toHaveProperty('headers')
  })

  it('delivers to an opted-out member whose address was added to a group send', async () => {
    const result = await send({ audience: 'all_members', customEmails: 'ben@oberlin.edu' })
    expect(sentTo()).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu', 'dee@oberlin.edu'])
    expect(result).toMatchObject({ recipientCount: 3, optedOutCount: 0 })
    expect(unsubscribes(messageFor('ben@oberlin.edu'))).toBeNull()
  })
})

describe('test sends', () => {
  it('shows a sender who is a member the same unsubscribe footer members get', async () => {
    state.tables.member_profiles.push(member(1, 'Olive'))
    await send({ audience: 'all_members', testOnly: true })
    expect(sentTo()).toEqual(['officer@oberlin.edu'])
    expect(unsubscribes(messageFor('officer@oberlin.edu'))).toBe(id(1))
    expect(state.inserts.audit_log).toBeUndefined()
  })

  it('sends a plain test to a sender who is not a member', async () => {
    await send({ audience: 'all_members', testOnly: true })
    expect(sentTo()).toEqual(['officer@oberlin.edu'])
    expect(messageFor('officer@oberlin.edu')).not.toHaveProperty('headers')
  })
})
