import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, send, sendBatch, lookup } = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), sendBatch: vi.fn(), lookup: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ rpc }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: send, sendTransactionalEmailBatch: sendBatch }))
// Service-role lookups of the removed member and the project title.
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => ({ select: () => ({ eq: (_column: string, value: string) => ({ maybeSingle: async () => lookup(table, value) }) }) }),
  }),
}))

import { performProjectTeamAction } from '@/lib/projects/teamAdmin'
import { removeProjectMember } from '@/lib/projects/workspace'
import { adminPortalGroups } from '@/lib/navigation/portal'

const projectId = '00000000-0000-4000-8000-000000000020'
const userId = '00000000-0000-4000-8000-000000000010'

beforeEach(() => {
  send.mockResolvedValue(true)
  sendBatch.mockResolvedValue(2)
  lookup.mockImplementation(async (table: string) => table === 'member_profiles'
    ? { data: { display_name: 'Ada Lovelace', oberlin_email: 'ada@oberlin.edu' }, error: null }
    : { data: { title: 'PET Bottle-to-Filament Recycling System' }, error: null })
})
afterEach(() => vi.resetAllMocks())

describe('removing someone from a project team', () => {
  it('emails the person an officer removed', async () => {
    rpc.mockResolvedValue({ data: { projectId, userId, previousRole: 'MEMBER' }, error: null })
    const response = await performProjectTeamAction({ action: 'remove-member', projectId, userId })

    expect(rpc).toHaveBeenCalledWith('admin_remove_project_member', { p_project_id: projectId, p_user_id: userId })
    expect(response).toMatchObject({ emailSent: true })
    const { to, message } = send.mock.calls[0][0]
    expect(to).toBe('ada@oberlin.edu')
    expect(message.subject).toBe('You were removed from PET Bottle-to-Filament Recycling System')
    expect(message.text).toContain('Hi Ada Lovelace,')
    expect(message.text).toContain('removed from the team for the MEO project “PET Bottle-to-Filament Recycling System”')
    expect(message.text).toContain('/member/teams')
  })

  it('emails the person a project lead removed', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(removeProjectMember(projectId, userId)).resolves.toEqual({ emailSent: true })
    expect(rpc).toHaveBeenCalledWith('remove_project_member', { p_project_id: projectId, p_target_user_id: userId })
    expect(send.mock.calls[0][0].to).toBe('ada@oberlin.edu')
  })

  it('sends nothing when the removal is refused', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'PROJECT_TEAM_ADMIN_REQUIRED' } })
    await expect(performProjectTeamAction({ action: 'remove-member', projectId, userId })).rejects.toThrow('PROJECT_TEAM_ADMIN_REQUIRED')
    expect(send).not.toHaveBeenCalled()
  })

  it('keeps the removal when the email cannot be sent', async () => {
    rpc.mockResolvedValue({ data: { projectId, userId, previousRole: 'MEMBER' }, error: null })
    send.mockRejectedValue(new Error('network'))
    await expect(performProjectTeamAction({ action: 'remove-member', projectId, userId })).resolves.toMatchObject({ emailSent: false })
  })
})

describe('deleting a project', () => {
  it('emails everyone who was on the team, read before the delete', async () => {
    const calls: string[] = []
    rpc.mockImplementation(async (name: string) => {
      calls.push(name)
      return name === 'admin_project_team'
        ? { data: { roster: [{ displayName: 'Ada', email: 'ada@oberlin.edu' }, { displayName: 'Ben', email: 'ben@oberlin.edu' }, { displayName: 'No email', email: '' }] }, error: null }
        : { data: { projectId, title: 'Smart Grow Rack', notifiedMembers: 3 }, error: null }
    })
    const response = await performProjectTeamAction({ action: 'delete', projectId, confirmTitle: 'Smart Grow Rack' })

    expect(calls).toEqual(['admin_project_team', 'delete_project'])
    expect(response).toMatchObject({ emailsSent: 2 })
    const batch = sendBatch.mock.calls[0][0]
    expect(batch.idempotencyKey).toBe(`project-deleted/${projectId}`)
    expect(batch.messages.map((m: { to: string }) => m.to)).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu'])
    expect(batch.messages[0].message.subject).toBe('Smart Grow Rack has been closed')
  })

  it('emails nobody when the delete is refused', async () => {
    rpc.mockImplementation(async (name: string) => name === 'admin_project_team'
      ? { data: { roster: [{ displayName: 'Ada', email: 'ada@oberlin.edu' }] }, error: null }
      : { data: null, error: { message: 'PROJECT_DELETE_CONFIRMATION_MISMATCH' } })
    await expect(performProjectTeamAction({ action: 'delete', projectId, confirmTitle: 'Wrong' })).rejects.toThrow('PROJECT_DELETE_CONFIRMATION_MISMATCH')
    expect(sendBatch).not.toHaveBeenCalled()
  })
})

it('has no separate Club teams page in the officer navigation', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN'] as const) {
    const hrefs = adminPortalGroups(role).flatMap(group => group.items).map(item => item.href)
    expect(hrefs).toContain('/admin/projects')
    expect(hrefs).not.toContain('/admin/teams')
  }
})
