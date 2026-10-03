import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import LeadershipPage from '@/app/(public)/leadership/page'
const api = vi.hoisted(() => ({ positions: vi.fn(async () => []) }))
vi.mock('@/lib/leadership/server', () => ({ listOfficerPositions: api.positions }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: async () => null }))
afterEach(() => { cleanup(); vi.unstubAllEnvs(); api.positions.mockClear() })
it('does not request live officer positions in an offline public preview', async () => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW','1'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','')
  render(await LeadershipPage())
  expect(api.positions).not.toHaveBeenCalled()
  expect(screen.getByText(/Officer openings are unavailable in this preview/)).toBeVisible()
})
it('continues to request published positions for the configured site', async () => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW','0')
  render(await LeadershipPage())
  expect(api.positions).toHaveBeenCalledOnce()
})
