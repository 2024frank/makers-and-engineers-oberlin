// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const { admin, send, consoleData } = vi.hoisted(() => ({ admin: vi.fn(), send: vi.fn(), consoleData: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ getCurrentAdmin: admin }))
vi.mock('@/lib/email/adminBroadcast', () => ({ sendAdminBroadcast: send, getAdminEmailConsoleData: consoleData }))

import { GET, POST } from '@/app/api/admin/email/route'
import { createFreshTokenFetch } from '@/lib/supabase/freshTokenFetch'
import { describeSendFailure } from '@/lib/email/sendFailure'

const officer = { userId: 'u1', email: 'officer@oberlin.edu', displayName: 'Officer', role: 'ADMIN', scopes: [], canPublish: true, active: true }
const sendRequest = () => new Request('https://admin.example.com/api/admin/email', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ audience: 'custom', customEmails: 'officer@oberlin.edu', subject: 'Hi', body: 'Hello', testOnly: true }),
})

afterEach(() => vi.clearAllMocks())

describe('admin email route session handling', () => {
  it('answers a missing officer session with JSON 401 instead of a login redirect', async () => {
    admin.mockResolvedValue(null)
    for (const response of [await POST(sendRequest()), await GET()]) {
      expect(response.status).toBe(401)
      expect(response.headers.get('location')).toBeNull()
      expect(await response.json()).toEqual({ error: 'SESSION_EXPIRED' })
    }
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses editors with JSON 403', async () => {
    admin.mockResolvedValue({ ...officer, role: 'EDITOR' })
    const response = await POST(sendRequest())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' })
    expect(send).not.toHaveBeenCalled()
  })

  it('sends for an admin', async () => {
    admin.mockResolvedValue(officer)
    send.mockResolvedValue({ ok: true, testOnly: true, recipientCount: 1, sentCount: 1, notifiedCount: 0 })
    const response = await POST(sendRequest())
    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledWith(officer, expect.objectContaining({ subject: 'Hi' }), 'https://admin.example.com')
  })
})

describe('PostgREST rejecting a just-issued token', () => {
  const restUrl = 'https://project.supabase.co/rest/v1/role_assignments?select=role'
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const issuedAtFuture = () => json(401, { code: 'PGRST303', details: null, hint: null, message: 'JWT issued at future' })

  it('repeats the request once with the same token after the issuing second has passed', async () => {
    const base = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(issuedAtFuture())
      .mockResolvedValueOnce(json(200, [{ role: 'ADMIN' }]))
    const init = { method: 'GET', headers: { Authorization: 'Bearer fresh' } }
    const response = await createFreshTokenFetch(base, 0)(restUrl, init)
    expect(response.status).toBe(200)
    expect(base).toHaveBeenCalledTimes(2)
    expect(base).toHaveBeenNthCalledWith(2, restUrl, init)
  })

  it('gives up after one retry', async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => issuedAtFuture())
    const response = await createFreshTokenFetch(base, 0)(restUrl)
    expect(response.status).toBe(401)
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('leaves other failures, auth endpoints and Request objects alone', async () => {
    const cases: Array<[RequestInfo | URL, Response]> = [
      [restUrl, json(401, { code: 'PGRST301', message: 'JWT could not be decoded' })],
      [restUrl, json(500, { code: 'PGRST303' })],
      ['https://project.supabase.co/auth/v1/user', json(401, { code: 'PGRST303' })],
      [new Request(restUrl), json(401, { code: 'PGRST303' })],
    ]
    for (const [input, reply] of cases) {
      const base = vi.fn<typeof fetch>().mockResolvedValue(reply)
      const response = await createFreshTokenFetch(base, 0)(input)
      expect(response.status).toBe(reply.status)
      expect(base).toHaveBeenCalledTimes(1)
    }
  })
})

describe('composer send-failure messages', () => {
  it('explains an expired session, whether it arrives as a 401 or as a followed login redirect', () => {
    expect(describeSendFailure({ status: 401, redirected: false }, { error: 'SESSION_EXPIRED' })).toMatch(/session has expired/)
    expect(describeSendFailure({ status: 405, redirected: true }, {})).toMatch(/session has expired/)
  })

  it('shows route error codes, and the HTTP status when the reply was not JSON', () => {
    expect(describeSendFailure({ status: 400, redirected: false }, { error: 'NO_RECIPIENTS_FOUND' })).toBe('NO_RECIPIENTS_FOUND')
    expect(describeSendFailure({ status: 504, redirected: false }, {})).toMatch(/took too long/)
    expect(describeSendFailure({ status: 500, redirected: false }, {})).toBe('Email send failed (HTTP 500). Reload the page and try again.')
  })
})
