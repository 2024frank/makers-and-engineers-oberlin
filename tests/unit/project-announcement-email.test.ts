// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { TransactionalEmailMessage } from '@/lib/email/templates'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), eq: vi.fn(), batch: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ update: mocks.update }) }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmailBatch: mocks.batch }))
import { announcePublishedProject } from '@/lib/projects/announcements'
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe'

type Sent = { to: string; message: TransactionalEmailMessage }
const ada = '11111111-1111-4111-8111-111111111111'
const project = { announced: true, projectId: 'project-1', slug: 'solar-cart', title: 'Solar Cart', summary: 'Build a solar charging cart.' }
const announce = async (recipients: unknown[]) => {
  mocks.rpc.mockResolvedValue({ data: { ...project, recipients }, error: null })
  const result = await announcePublishedProject('project-1')
  return { result, messages: mocks.batch.mock.calls[0][0].messages as Sent[] }
}

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-signing-secret-that-is-longer-than-32-characters')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://makeoberlin.site')
  mocks.rpc.mockReset()
  mocks.update.mockReset().mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockReset().mockResolvedValue({ error: null })
  mocks.batch.mockReset().mockImplementation(async ({ messages }: { messages: Sent[] }) => messages.length)
})
afterEach(() => { vi.unstubAllEnvs() })

it('sends each member the project with their own unsubscribe link and one-click headers', async () => {
  const { result, messages } = await announce([{ userId: ada, email: 'ada@oberlin.edu', displayName: 'Ada' }])
  expect(result).toEqual({ announced: true, emailsSent: 1 })
  const [{ to, message }] = messages
  expect(to).toBe('ada@oberlin.edu')
  const link = message.headers!['List-Unsubscribe'].slice(1, -1)
  expect(link.startsWith('https://www.makeoberlin.site/unsubscribe?token=')).toBe(true)
  expect(verifyUnsubscribeToken(new URL(link).searchParams.get('token'))).toBe(ada)
  expect(message.headers!['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  expect(message.text).toContain('https://makeoberlin.site/projects/solar-cart')
  expect(message.text.endsWith(`Unsubscribe from club announcement email: ${link}`)).toBe(true)
  expect(mocks.update).toHaveBeenCalledWith({ emails_sent: 1 })
})

it('emails exactly the recipients the database returns, which leaves out members who opted out', async () => {
  const { messages } = await announce([
    { userId: ada, email: 'ada@oberlin.edu', displayName: 'Ada' },
    { userId: '22222222-2222-4222-8222-222222222222', email: 'ben@oberlin.edu', displayName: 'Ben' },
  ])
  expect(messages.map(item => item.to)).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu'])
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('announce_published_project', { p_project_id: 'project-1' })
})

// Before migration 049 the database function returns no member ids.
it('still announces from a database that has not been migrated, without unsubscribe links', async () => {
  const { result, messages } = await announce([{ email: 'ada@oberlin.edu', displayName: 'Ada' }])
  expect(result.emailsSent).toBe(1)
  expect(messages[0].message).not.toHaveProperty('headers')
  expect(messages[0].message.text).not.toMatch(/unsubscribe/i)
})

it('sends nothing when the project was already announced', async () => {
  mocks.rpc.mockResolvedValue({ data: { announced: false }, error: null })
  expect(await announcePublishedProject('project-1')).toEqual({ announced: false, emailsSent: 0 })
  expect(mocks.batch).not.toHaveBeenCalled()
})
