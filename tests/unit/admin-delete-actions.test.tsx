import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { DeleteConfirm } from '@/components/admin/DeleteConfirm'
import { contentDeleteMessage, deletableContentTypes } from '@/lib/cms/contentDeleteMessages'
import { staffAccessErrorMessage } from '@/lib/auth/staffInviteMessages'

afterEach(cleanup)

it('asks for confirmation naming the item before deleting', async () => {
  const onConfirm = vi.fn().mockResolvedValue(null)
  render(<DeleteConfirm label="Delete event" itemName="Spring Showcase" consequence="Removes it." onConfirm={onConfirm}/>)
  await userEvent.click(screen.getByRole('button', { name: /Delete event/ }))
  expect(screen.getByText(/Delete Spring Showcase\?/)).toBeTruthy()
  expect(onConfirm).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
})

it('keeps the button disabled until the name is typed when typed confirmation is required', async () => {
  const onConfirm = vi.fn().mockResolvedValue(null)
  render(<DeleteConfirm requireTyped label="Delete team" itemName="Water sensors" consequence="Removes it." onConfirm={onConfirm}/>)
  await userEvent.click(screen.getByRole('button', { name: /Delete team/ }))
  const confirm = screen.getByRole('button', { name: 'Delete permanently' }) as HTMLButtonElement
  expect(confirm.disabled).toBe(true)
  await userEvent.type(screen.getByLabelText(/Type/), 'water sensors')
  expect(confirm.disabled).toBe(false)
  await userEvent.click(confirm)
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('water sensors'))
})

it('shows the server error and cancels without deleting', async () => {
  const onConfirm = vi.fn().mockResolvedValue('Blocked by the server.')
  render(<DeleteConfirm label="Delete request" itemName="Ada's request" consequence="Removes it." onConfirm={onConfirm}/>)
  await userEvent.click(screen.getByRole('button', { name: /Delete request/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Blocked by the server.')
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('alert')).toBeNull()
})

it('lists the deletable content types without projects and maps error codes', () => {
  expect(deletableContentTypes).not.toContain('projects')
  expect(deletableContentTypes).toContain('events')
  expect(contentDeleteMessage('OFFICER_POSITION_HAS_HISTORY')).toMatch(/applied for/)
  expect(contentDeleteMessage('nonsense')).toMatch(/Nothing was removed/)
  expect(staffAccessErrorMessage('CANNOT_REMOVE_SELF', 'remove')).toMatch(/your own access/)
})

it('migration 029 checks the role, audits, and is not granted to anon', () => {
  const sql = readFileSync('database/migrations/029_admin_delete_actions.sql', 'utf8')
  for (const fn of ['delete_content_entity', 'delete_submission', 'admin_delete_club_team', 'remove_member', 'remove_staff_access']) {
    expect(sql).toContain(`function public.${fn}(`)
    expect(sql).toContain(`revoke all on function public.${fn}(`)
  }
  expect(sql.match(/insert into public\.audit_log/g)?.length).toBeGreaterThanOrEqual(6)
  expect(sql).toContain('FINAL_ADMIN_REQUIRED')
  expect(sql).toContain('CANNOT_REMOVE_SELF')
})
