// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendTransactionalEmail, sendTransactionalEmailBatch } from '@/lib/email/client'
import { unsubscribeSiteOrigin } from '@/lib/email/siteOrigin'
import {
  memberMagicLinkEmail,
  memberPasswordResetEmail,
  membershipInvitationEmail,
  membershipVerificationEmail,
  newProjectEmail,
  projectApplicationDecisionEmail,
  projectKickoffEmail,
  projectProposalReviewEmail,
  projectTeamInvitationEmail,
  renderAdminBroadcastEmail,
  unsubscribeHeaders,
} from '@/lib/email/templates'
import { announcementUnsubscribeUrl, createUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe'
import { officerOpeningEmail } from '@/lib/leadership/emailTemplate'

const secret = 'test-only-signing-secret-that-is-longer-than-32-characters'
const ada = '11111111-1111-4111-8111-111111111111'
const ben = '22222222-2222-4222-8222-222222222222'
const link = 'https://www.makeoberlin.site/unsubscribe?token=example'
const oneClick = { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }

beforeEach(() => { vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', secret) })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('unsubscribe token', () => {
  it('verifies back to the member it was issued for', () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken(ada))).toBe(ada)
    expect(verifyUnsubscribeToken(createUnsubscribeToken(ben))).toBe(ben)
  })

  // Links in mail that was already sent must keep working, so the format is pinned here.
  it('is the member id plus an HMAC-SHA256 over a fixed context and that id', () => {
    const signature = createHmac('sha256', secret).update(`announcement-unsubscribe:v1:${ada}`, 'utf8').digest('base64url')
    expect(createUnsubscribeToken(ada)).toBe(`${ada}.${signature}`)
    expect(createUnsubscribeToken(ada)).not.toContain(secret)
  })

  it('rejects a token moved to another member', () => {
    const signature = createUnsubscribeToken(ada)!.split('.')[1]
    expect(verifyUnsubscribeToken(`${ben}.${signature}`)).toBeNull()
  })

  it('rejects an altered signature', () => {
    const token = createUnsubscribeToken(ada)!
    const last = token.at(-1) === 'A' ? 'B' : 'A'
    expect(verifyUnsubscribeToken(`${token.slice(0, -1)}${last}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const token = createUnsubscribeToken(ada)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'another-signing-secret-that-is-also-longer-than-32-characters')
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('rejects a signature made without the unsubscribe context', () => {
    const bare = createHmac('sha256', secret).update(ada, 'utf8').digest('base64url')
    expect(verifyUnsubscribeToken(`${ada}.${bare}`)).toBeNull()
  })

  it.each([undefined, null, 42, '', 'not-a-token', ada, `${ada}.`, `.${'A'.repeat(43)}`, `${ada}.${'A'.repeat(42)}`,
    `${ada}.${'A'.repeat(44)}`, `${ada}.${'!'.repeat(43)}`, `${ada.toUpperCase()}.${'A'.repeat(43)}`, `not-a-uuid.${'A'.repeat(43)}`])(
    'rejects malformed token %j', token => {
      expect(verifyUnsubscribeToken(token)).toBeNull()
    })

  it('rejects a valid token with anything appended', () => {
    expect(verifyUnsubscribeToken(`${createUnsubscribeToken(ada)}.extra`)).toBeNull()
  })

  it.each([undefined, '', 'short-secret', 'x'.repeat(31)])('neither signs nor verifies with missing or undersized secret %j', configured => {
    const token = createUnsubscribeToken(ada)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', configured)
    expect(createUnsubscribeToken(ada)).toBeNull()
    expect(verifyUnsubscribeToken(token)).toBeNull()
    expect(announcementUnsubscribeUrl(ada)).toBeNull()
  })

  it('does not sign anything that is not a member id', () => {
    expect(createUnsubscribeToken('ada@oberlin.edu')).toBeNull()
    expect(announcementUnsubscribeUrl(null)).toBeNull()
    expect(announcementUnsubscribeUrl('')).toBeNull()
  })
})

describe('unsubscribe link', () => {
  // The bare domain redirects to www, and a one-click unsubscribe POST must not be redirected.
  it.each([undefined, '', 'https://makeoberlin.site', 'https://admin.makeoberlin.site', 'https://www.makeoberlin.site'])(
    'opens on the host that serves the public site when the origin is %j', origin => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
      const url = new URL(announcementUnsubscribeUrl(ada, origin)!)
      expect(url.origin).toBe('https://www.makeoberlin.site')
      expect(url.pathname).toBe('/unsubscribe')
      expect(verifyUnsubscribeToken(url.searchParams.get('token'))).toBe(ada)
    })

  it('uses the configured site when no origin is passed', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://makeoberlin.site')
    expect(announcementUnsubscribeUrl(ada)).toMatch(/^https:\/\/www\.makeoberlin\.site\/unsubscribe\?token=/)
  })

  it('leaves local and preview origins alone', () => {
    expect(unsubscribeSiteOrigin('http://localhost:3000')).toBe('http://localhost:3000')
    expect(unsubscribeSiteOrigin('https://meo-preview.vercel.app/')).toBe('https://meo-preview.vercel.app')
  })

  it('identifies the member by an opaque id, never by email address', () => {
    expect(announcementUnsubscribeUrl(ada)).not.toMatch(/@|oberlin\.edu/)
  })
})

describe('announcement templates', () => {
  it('builds the one-click headers around the link', () => {
    expect(unsubscribeHeaders(link)).toEqual(oneClick)
  })

  it('puts the link in the officer broadcast footer, text and HTML, and in the headers', () => {
    const email = renderAdminBroadcastEmail({ recipientName: 'Ada', subject: 'Build night', body: 'Thursday at 7.', unsubscribeUrl: link })
    expect(email.headers).toEqual(oneClick)
    expect(email.text.trimEnd().endsWith(`Unsubscribe from club announcement email: ${link}`)).toBe(true)
    expect(email.html).toContain(`<a href="${link}"`)
    expect(email.html).toContain('Unsubscribe from club announcement email</a>')
  })

  it('leaves a direct officer message without a link or headers', () => {
    const email = renderAdminBroadcastEmail({ recipientName: 'Ada', subject: 'About your application', body: 'Can we talk Friday?' })
    expect(email).not.toHaveProperty('headers')
    expect(`${email.text}${email.html}`).not.toMatch(/unsubscribe/i)
  })

  it('ignores a link that is not a web address', () => {
    const email = renderAdminBroadcastEmail({ subject: 'Build night', body: 'Thursday at 7.', unsubscribeUrl: 'javascript:alert(1)' })
    expect(email).not.toHaveProperty('headers')
    expect(`${email.text}${email.html}`).not.toMatch(/unsubscribe|javascript/i)
  })

  it('adds the link and headers to a new-project announcement', () => {
    const input = { memberName: 'Ada', projectTitle: 'Solar Cart', summary: 'Build a solar charging cart.', actionUrl: 'https://makeoberlin.site/projects/solar-cart' }
    const email = newProjectEmail({ ...input, unsubscribeUrl: link })
    expect(email.headers).toEqual(oneClick)
    expect(email.text.endsWith(`Unsubscribe from club announcement email: ${link}`)).toBe(true)
    expect(email.text).toContain('https://makeoberlin.site/projects/solar-cart')
    expect(newProjectEmail(input)).toEqual({ subject: 'New MEO project: Solar Cart', text: expect.not.stringMatching(/unsubscribe/i) })
  })

  it('adds the link and headers to an officer-opening announcement', () => {
    const input = { displayName: 'Ada', roleTitle: 'Secretary', term: 'Fall', bio: 'Keep meeting records.', closesAt: null, positionId: 'role-1' }
    const email = officerOpeningEmail({ ...input, unsubscribeUrl: link })
    expect(email.headers).toEqual(oneClick)
    expect(email.text.endsWith(`Unsubscribe from club announcement email: ${link}`)).toBe(true)
    expect(officerOpeningEmail(input)).toEqual({ subject: 'MEO is looking for a Secretary', text: expect.not.stringMatching(/unsubscribe/i) })
  })

  it('never adds unsubscribe headers or wording to account email', () => {
    const account = [
      membershipVerificationEmail({ displayName: 'Ada', verificationUrl: 'https://makeoberlin.site/auth/email-action?x=1' }),
      membershipInvitationEmail({ displayName: 'Ada', verificationUrl: 'https://makeoberlin.site/auth/email-action?x=1' }),
      memberMagicLinkEmail({ displayName: 'Ada', magicUrl: 'https://makeoberlin.site/auth/email-action?x=1' }),
      memberPasswordResetEmail({ displayName: 'Ada', resetUrl: 'https://makeoberlin.site/auth/email-action?x=1' }),
      projectApplicationDecisionEmail({ memberName: 'Ada', projectTitle: 'Solar Cart', decision: 'ACCEPTED', actionUrl: 'https://makeoberlin.site/member/teams/1' }),
      projectProposalReviewEmail({ memberName: 'Ada', projectTitle: 'Solar Cart', decision: 'APPROVED' }),
      projectTeamInvitationEmail({ inviteeName: 'Ada', projectTitle: 'Solar Cart', inviterName: 'Ben', actionUrl: 'https://makeoberlin.site/member/invitations' }),
      projectKickoffEmail({ memberName: 'Ada', projectTitle: 'Solar Cart', role: 'MEMBER', actionUrl: 'https://makeoberlin.site/member/teams/1' }),
    ]
    for (const email of account) {
      expect(email).not.toHaveProperty('headers')
      expect(email.text).not.toMatch(/unsubscribe/i)
    }
  })
})

describe('headers sent to the mail provider', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'key'); vi.stubEnv('RESEND_FROM_EMAIL', 'MEO <club@example.com>')
    fetchMock.mockReset().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
  })
  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)

  it('passes a message\'s headers through on a single send', async () => {
    await sendTransactionalEmail({ to: 'Ada@Oberlin.edu', message: { subject: 'Build night', text: 'Thursday at 7.', headers: oneClick } })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.resend.com/emails')
    expect(sentBody()).toEqual({
      from: 'MEO <club@example.com>', reply_to: 'makers.engineers@oberlin.edu', to: ['ada@oberlin.edu'],
      subject: 'Build night', text: 'Thursday at 7.', headers: oneClick,
    })
  })

  it('passes each recipient\'s own headers through on a batch send', async () => {
    const benLink = 'https://www.makeoberlin.site/unsubscribe?token=ben'
    await sendTransactionalEmailBatch({ messages: [
      { to: 'ada@oberlin.edu', message: { subject: 'Build night', text: 'Hi Ada', headers: oneClick } },
      { to: 'ben@oberlin.edu', message: { subject: 'Build night', text: 'Hi Ben', headers: unsubscribeHeaders(benLink) } },
      { to: 'guest@example.org', message: { subject: 'Build night', text: 'Hi there' } },
    ] })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.resend.com/emails/batch')
    const [first, second, third] = sentBody()
    expect(first.headers).toEqual(oneClick)
    expect(second.headers).toEqual({ 'List-Unsubscribe': `<${benLink}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
    expect(third).not.toHaveProperty('headers')
  })

  it.each([undefined, {}])('sends no headers field for a message that has none (%j)', async headers => {
    await sendTransactionalEmail({ to: 'ada@oberlin.edu', message: { subject: 'Sign in', text: 'Link', headers } })
    expect(sentBody()).not.toHaveProperty('headers')
  })

  it('sends the rendered officer broadcast with its unsubscribe headers', async () => {
    await sendTransactionalEmail({ to: 'ada@oberlin.edu', message: renderAdminBroadcastEmail({ subject: 'Build night', body: 'Thursday at 7.', unsubscribeUrl: link }) })
    expect(sentBody().headers).toEqual(oneClick)
    expect(sentBody().text).toContain(link)
    expect(sentBody().html).toContain(link)
  })
})
