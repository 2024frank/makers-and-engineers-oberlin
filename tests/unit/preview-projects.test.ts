import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { previewProjects, publicPreviewEnabled } from '@/lib/content/previewProjects'
import { getProjectTeamStats } from '@/lib/content/projectTeamStats'

const admin = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: admin.createClient }))

beforeEach(() => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW', '1')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  admin.createClient.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

describe('Public project snapshot', () => {
  it('does not invent team counts, milestones, or start dates when no backend is connected', async () => {
    expect(await getProjectTeamStats(previewProjects.map(project => project.id))).toEqual({})
    expect(admin.createClient).not.toHaveBeenCalled()
  })

  it('requires explicit preview mode and never replaces a configured backend', () => {
    expect(publicPreviewEnabled()).toBe(true)
    vi.stubEnv('OEC_PUBLIC_PREVIEW', '0')
    expect(publicPreviewEnabled()).toBe(false)
    vi.stubEnv('OEC_PUBLIC_PREVIEW', '1')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://configured.example')
    expect(publicPreviewEnabled()).toBe(false)
  })

  it('preserves verified team counts and milestones when a backend is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://configured.example')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    const rows: Record<string, unknown[]> = {
      projects: [{ id: 'real-project', started_at: '2026-09-20T12:00:00Z' }],
      project_memberships: [{ project_id: 'real-project', user_id: 'member', status: 'ACTIVE' }],
      project_milestones: [{ project_id: 'real-project', status: 'DONE' }],
      club_team_projects: [],
      member_profiles: [{ user_id: 'member' }],
    }
    admin.createClient.mockReturnValue({
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          in: async () => ({ data: rows[table], error: null }),
        }
        return query
      },
    })
    expect(await getProjectTeamStats(['real-project'])).toEqual({
      'real-project': { memberCount: 1, milestonesTotal: 1, milestonesDone: 1, startedAt: '2026-09-20T12:00:00Z' },
    })
    expect(admin.createClient).toHaveBeenCalledOnce()
  })
})
