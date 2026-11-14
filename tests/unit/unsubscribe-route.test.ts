// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), client: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: mocks.client }))
import { GET, POST } from '@/app/unsubscribe/route'
import { announcementUnsubscribeUrl, createUnsubscribeToken } from '@/lib/email/unsubscribe'

const secret = 'test-only-signing-secret-that-is-longer-than-32-characters'
const ada = '11111111-1111-4111-8111-111111111111'
const address = (token: string) => `https://www.makeoberlin.site/unsubscribe?token=${token}`
const validAddress = () => address(createUnsubscribeToken(ada)!)
const forged = `${ada}.${'A'.repeat(43)}`

// What a mail app sends from its own unsubscribe button (RFC 8058).
function oneClick(url: string, encoding: 'urlencoded' | 'multipart' = 'urlencoded') {
  if (encoding === 'multipart') {
    const body = new FormData()
    body.set('List-Unsubscribe', 'One-Click')
    return new Request(url, { method: 'POST', body })
  }
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' })
}
// What the confirm page's button sends: a form post with no fields.
const confirmClick = (url: string) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '' })

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', secret)
  mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null })
  mocks.client.mockReset().mockReturnValue({ rpc: mocks.rpc })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('opening the link (GET)', () => {
  it('shows a confirm page and changes nothing', async () => {
    const response = await GET(new Request(validAddress()))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('Turn off club announcement email?')
    expect(html).toContain(`<form method="post" action="/unsubscribe?token=${createUnsubscribeToken(ada)}">`)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('keeps the page out of search results, caches and referrers', async () => {
    const response = await GET(new Request(validAddress()))
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it.each(['', 'nonsense', forged, `${forged}"><script>alert(1)</script>`])('refuses the invalid token %j without offering a button', async token => {
    const response = await GET(new Request(address(encodeURIComponent(token))))
    const html = await response.text()
    expect(response.status).toBe(400)
    expect(html).toContain('This unsubscribe link does not work')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<script')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuses a link with no token', async () => {
    expect((await GET(new Request('https://www.makeoberlin.site/unsubscribe'))).status).toBe(400)
  })
})

describe('unsubscribing (POST)', () => {
  it.each(['urlencoded', 'multipart'] as const)('turns announcement email off for a mail app\'s one-click request (%s)', async encoding => {
    const response = await POST(oneClick(validAddress(), encoding))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('set_member_announcement_email_opt_out', { p_user_id: ada, p_opt_out: true, p_source: 'one_click' })
  })

  // RFC 8058: the one-click POST must be answered directly, never redirected.
  it('answers the one-click request without a redirect', async () => {
    const response = await POST(oneClick(validAddress()))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('turns announcement email off from the confirm page and says so', async () => {
    const response = await POST(confirmClick(validAddress()))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('Announcement email is off')
    expect(html).toContain('href="/member/profile"')
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('set_member_announcement_email_opt_out', { p_user_id: ada, p_opt_out: true, p_source: 'email_link' })
  })

  it('accepts a request with no body at all', async () => {
    const response = await POST(new Request(validAddress(), { method: 'POST' }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledOnce()
  })

  it('works with the link exactly as announcement email carries it', async () => {
    const response = await POST(oneClick(announcementUnsubscribeUrl(ada, 'https://admin.makeoberlin.site')!))
    expect(response.status).toBe(200)
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_user_id: ada, p_opt_out: true })
  })

  it.each(['', 'nonsense', forged])('changes nothing for the invalid token %j', async token => {
    const response = await POST(oneClick(address(token)))
    expect(response.status).toBe(400)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('changes nothing for a token signed with another secret', async () => {
    const url = validAddress()
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'another-signing-secret-that-is-also-longer-than-32-characters')
    expect((await POST(oneClick(url))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('reports a link whose member profile no longer exists', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null })
    const response = await POST(oneClick(validAddress()))
    expect(response.status).toBe(404)
    expect(await response.text()).toContain('This unsubscribe link does not work')
  })

  it('does not claim success when the setting could not be saved', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'database unavailable' } })
    const response = await POST(confirmClick(validAddress()))
    const html = await response.text()
    expect(response.status).toBe(500)
    expect(html).toContain('We could not save that')
    expect(html).not.toContain('Announcement email is off')
    expect(html).toContain(`<form method="post" action="/unsubscribe?token=${createUnsubscribeToken(ada)}">`)
  })

  it('does not claim success when the server is not configured', async () => {
    mocks.client.mockImplementation(() => { throw new Error('SUPABASE_SERVICE_CONFIG_MISSING') })
    expect((await POST(oneClick(validAddress()))).status).toBe(500)
  })
})
