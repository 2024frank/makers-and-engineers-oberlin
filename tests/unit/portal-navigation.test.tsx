import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminShell } from '@/components/admin/AdminShell'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { MemberShell } from '@/components/member/MemberShell'
import type { CurrentAdmin } from '@/lib/auth/session'

const route = vi.hoisted(() => ({ pathname: '/admin' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/SignOutButton', () => ({ SignOutButton: () => <button>Sign out</button> }))
const admin: CurrentAdmin = { userId: 'officer', displayName: 'Officer', email: 'officer@example.com', role: 'SUPER_ADMIN', scopes: [], canPublish: true, active: true }

afterEach(() => { cleanup(); route.pathname = '/admin'; vi.unstubAllGlobals() })

describe('Portal navigation', () => {
  it('marks nested pages active on both the officer host and the local admin path', () => {
    route.pathname = '/pages/home'
    const view = render(<AdminSidebar admin={admin}/>)
    expect(screen.getByRole('link', { name: 'Website pages' })).toHaveAttribute('aria-current', 'page')
    route.pathname = '/admin/pages/home'
    view.rerender(<AdminSidebar admin={admin}/>)
    expect(screen.getByRole('link', { name: 'Website pages' })).toHaveAttribute('aria-current', 'page')
  })

  it('lets an officer recover from a navigation search with no results', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar admin={admin}/>)
    await user.type(screen.getByRole('searchbox'), 'no such page')
    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear navigation search' }))
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
  })

  it('keeps restricted destinations out of editor navigation', () => {
    render(<AdminSidebar admin={{ ...admin, role: 'EDITOR' }}/>)
    expect(screen.queryByRole('link', { name: 'Member requests' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Staff access' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
  })

  it('opens member navigation as a modal and restores focus when dismissed', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    const user = userEvent.setup()
    route.pathname = '/member/teams/example'
    render(<MemberShell member={{ displayName: 'Ada', email: 'ada@example.com' }}><h1>My project</h1></MemberShell>)
    const opener = screen.getByRole('button', { name: 'Open member navigation' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Member navigation' })
    expect(within(dialog).getByRole('link', { name: 'My teams' })).toHaveAttribute('aria-current', 'page')
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(opener).toHaveAttribute('aria-expanded', 'false')
    expect(opener).toHaveFocus()
  })

  it('shows the unread notification count on the member bell', () => {
    route.pathname = '/member'
    const { rerender } = render(<MemberShell member={{ displayName: 'Ada', email: 'ada@example.com' }} unreadNotifications={4}><h1>Home</h1></MemberShell>)
    expect(screen.getByRole('link', { name: 'Notifications, 4 unread' })).toHaveTextContent('4')
    rerender(<MemberShell member={{ displayName: 'Ada', email: 'ada@example.com' }}><h1>Home</h1></MemberShell>)
    expect(screen.getByTitle('Notifications')).toHaveAccessibleName('Notifications')
    expect(screen.getByTitle('Notifications')).toHaveTextContent('')
  })

  it('toggles desktop sidebar rail collapse without hiding accessible link names', async () => {
    route.pathname = '/admin/projects'
    const user = userEvent.setup()
    const { container } = render(
      <AdminShell admin={admin}>
        <h1>Projects</h1>
      </AdminShell>,
    )
    const shell = container.querySelector('.admin-shell')
    expect(shell).not.toHaveAttribute('data-rail-collapsed')

    const collapseBtn = screen.getByRole('button', { name: 'Collapse sidebar navigation' })
    await user.click(collapseBtn)
    expect(shell).toHaveAttribute('data-rail-collapsed', 'true')
    expect(screen.getByRole('button', { name: 'Expand sidebar navigation' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'Expand sidebar navigation' }))
    expect(shell).not.toHaveAttribute('data-rail-collapsed')
  })

  it('renders live queue badges while preserving exact link accessible names', () => {
    route.pathname = '/admin'
    render(
      <AdminShell admin={admin} badges={{ '/admin/submissions': 7, '/admin/member-applications': 3 }}>
        <h1>Overview</h1>
      </AdminShell>,
    )
    const inboxLink = screen.getByRole('link', { name: 'Inbox' })
    expect(inboxLink).toHaveTextContent('Inbox7')
    const memberReqLink = screen.getByRole('link', { name: 'Member requests' })
    expect(memberReqLink).toHaveTextContent('Member requests3')
  })

  it('opens the Command+K quick-jump palette, filters pages, and closes cleanly', async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
    route.pathname = '/member'
    const user = userEvent.setup()
    render(
      <MemberShell member={{ displayName: 'Ada', email: 'ada@example.com' }}>
        <h1>Home</h1>
      </MemberShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Quick jump (Command+K)' }))
    const palette = screen.getByRole('dialog', { name: 'Quick jump in member portal' })
    const input = within(palette).getByRole('searchbox', { name: 'Jump to portal page' })
    await user.type(input, 'notifications')

    expect(within(palette).getByRole('option', { name: /Notifications/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(palette).queryByRole('option', { name: /Member directory/ })).not.toBeInTheDocument()

    await user.click(within(palette).getByRole('button', { name: 'ESC' }))
    expect(screen.queryByRole('dialog', { name: 'Quick jump in member portal' })).not.toBeInTheDocument()
  })
})
