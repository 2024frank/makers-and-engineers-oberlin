import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nextHeaders = vi.hoisted(() => ({ headers: vi.fn(), cookies: vi.fn() }))
vi.mock('next/headers', () => ({ headers: nextHeaders.headers, cookies: nextHeaders.cookies }))
vi.mock('server-only', () => ({}))

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listOfficerPositions } from '@/lib/leadership/server'

beforeEach(() => {
  nextHeaders.headers.mockReset().mockResolvedValue(new Headers())
  nextHeaders.cookies.mockReset().mockResolvedValue({ getAll: () => [], set: vi.fn() })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Unconfigured build safety', () => {
  it('reads request headers before throwing SUPABASE_PUBLIC_CONFIG_MISSING', async () => {
    await expect(createSupabaseServerClient()).rejects.toThrow('SUPABASE_PUBLIC_CONFIG_MISSING')
    expect(nextHeaders.headers).toHaveBeenCalledOnce()
  })

  it('propagates dynamic server errors from headers() before checking env vars', async () => {
    const dynamicError = new Error('Dynamic server usage: Route couldn’t be rendered statically')
    nextHeaders.headers.mockRejectedValueOnce(dynamicError)
    await expect(createSupabaseServerClient()).rejects.toBe(dynamicError)
  })

  it('returns no open officer positions when public Supabase env vars are absent', async () => {
    await expect(listOfficerPositions()).resolves.toEqual([])
    expect(nextHeaders.headers).not.toHaveBeenCalled()
  })
})
