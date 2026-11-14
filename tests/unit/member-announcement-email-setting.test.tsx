import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  setting: { data: null, error: null } as { data: { announcement_email_opt_out: boolean } | null; error: { message: string } | null },
  rpc: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    rpc: db.rpc,
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: () => ({
          single: async () => ({ data: table === 'member_profiles' ? db.profile : { directory_visible: true, visible_fields: ['display_name'], share_contact: false }, error: null }),
          maybeSingle: async () => (columns === 'announcement_email_opt_out' ? db.setting : { data: null, error: null }),
        }),
      }),
      update: (values: unknown) => { db.update(values); return { eq: async () => ({ error: null }) } },
    }),
  }),
}))
import { ProfileForm } from '@/components/member/ProfileForm'
import { getMemberProfileSettings, updateMemberProfile, type MemberProfileSettings } from '@/lib/members/profile'

const userId = '11111111-1111-4111-8111-111111111111'
const settings = (announcementEmails: boolean | null): MemberProfileSettings => ({
  userId, email: 'ada@oberlin.edu', displayName: 'Ada', classYear: 2028, major: 'Physics', disciplines: [], skills: [], projectInterests: [],
  availability: '', portfolioUrl: '', githubUrl: '', linkedinUrl: '', directoryVisible: true, visibleFields: ['display_name'], shareContact: false,
  announcementEmails,
})

beforeEach(() => {
  db.profile = { user_id: userId, oberlin_email: 'ada@oberlin.edu', display_name: 'Ada', class_year: 2028, major: 'Physics' }
  db.setting = { data: { announcement_email_opt_out: false }, error: null }
  db.rpc.mockReset().mockResolvedValue({ data: true, error: null })
  db.update.mockReset()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('reading the setting', () => {
  it('reports announcement email as on by default and off after an opt-out', async () => {
    expect((await getMemberProfileSettings(userId)).announcementEmails).toBe(true)
    db.setting = { data: { announcement_email_opt_out: true }, error: null }
    expect((await getMemberProfileSettings(userId)).announcementEmails).toBe(false)
  })

  it('still loads the profile, with the setting unknown, when the setting cannot be read', async () => {
    db.setting = { data: null, error: { message: 'column member_profiles.announcement_email_opt_out does not exist' } }
    expect(await getMemberProfileSettings(userId)).toMatchObject({ displayName: 'Ada', announcementEmails: null })
  })
})

describe('saving the setting', () => {
  const profile = { displayName: 'Ada', classYear: 2028, visibleFields: ['display_name'] }
  const settingCalls = () => db.rpc.mock.calls.filter(([name]) => name === 'set_my_announcement_email_opt_out')

  it('turns announcement email off and back on through the member-only function', async () => {
    await updateMemberProfile({ ...profile, announcementEmails: false }, userId)
    await updateMemberProfile({ ...profile, announcementEmails: true }, userId)
    expect(settingCalls()).toEqual([
      ['set_my_announcement_email_opt_out', { p_opt_out: true }],
      ['set_my_announcement_email_opt_out', { p_opt_out: false }],
    ])
  })

  // The phone app and an older open form do not send the field.
  it.each([undefined, null, 'on', 0])('leaves the setting alone when the save does not carry it (%j)', async announcementEmails => {
    await updateMemberProfile({ ...profile, announcementEmails }, userId)
    expect(settingCalls()).toEqual([])
    expect(db.update).toHaveBeenCalledOnce()
  })

  it('reports a failed change instead of a silent success', async () => {
    db.rpc.mockImplementation(async (name: string) => (name === 'set_my_announcement_email_opt_out' ? { data: null, error: { message: 'ACTIVE_MEMBER_REQUIRED' } } : { data: null, error: null }))
    await expect(updateMemberProfile({ ...profile, announcementEmails: false }, userId)).rejects.toThrow('MEMBER_EMAIL_PREFERENCE_UPDATE_FAILED:ACTIVE_MEMBER_REQUIRED')
  })
})

describe('the profile form', () => {
  const fetchMock = vi.fn()
  const toggle = () => screen.getByRole('checkbox', { name: 'Email me club announcements' })
  const save = () => userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  const lastPayload = () => JSON.parse(fetchMock.mock.calls.at(-1)![1].body)
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('shows the toggle on for a member who gets announcement email and off for one who opted out', () => {
    render(<ProfileForm initial={settings(true)} />)
    expect(toggle()).toBeChecked()
    cleanup()
    render(<ProfileForm initial={settings(false)} />)
    expect(toggle()).not.toBeChecked()
  })

  it('lets a member who unsubscribed turn announcement email back on', async () => {
    render(<ProfileForm initial={settings(false)} />)
    await userEvent.click(toggle())
    await save()
    expect(await screen.findByRole('status')).toHaveTextContent('Profile and directory privacy saved. Club announcement email is now on.')
    expect(lastPayload().announcementEmails).toBe(true)
  })

  it('turns announcement email off and says so', async () => {
    render(<ProfileForm initial={settings(true)} />)
    await userEvent.click(toggle())
    await save()
    expect(await screen.findByRole('status')).toHaveTextContent('Club announcement email is now off.')
    expect(lastPayload().announcementEmails).toBe(false)
  })

  // Otherwise a profile opened before an unsubscribe would switch announcements back on.
  it('does not send the setting when the member did not change it', async () => {
    render(<ProfileForm initial={settings(true)} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Major' }), ' and Math')
    await save()
    expect(await screen.findByRole('status')).toHaveTextContent(/^Profile and directory privacy saved\.$/)
    expect(lastPayload()).not.toHaveProperty('announcementEmails')
    expect(lastPayload().major).toBe('Physics and Math')
  })

  it('sends a change once, not again on the next save', async () => {
    render(<ProfileForm initial={settings(true)} />)
    await userEvent.click(toggle())
    await save()
    await screen.findByText(/now off/)
    await save()
    expect(await screen.findByRole('status')).toHaveTextContent(/^Profile and directory privacy saved\.$/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(lastPayload()).not.toHaveProperty('announcementEmails')
  })

  it('leaves the toggle out when the setting could not be read, and never sends a guess', async () => {
    render(<ProfileForm initial={settings(null)} />)
    expect(screen.queryByRole('checkbox', { name: 'Email me club announcements' })).toBeNull()
    await save()
    await screen.findByRole('status')
    expect(lastPayload()).not.toHaveProperty('announcementEmails')
  })
})
