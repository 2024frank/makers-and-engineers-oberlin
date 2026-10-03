import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicHeader } from '@/components/public/PublicHeader'
import type { PublicNavigationItem } from '@/lib/page-builder/publicPages'

const route = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))

afterEach(() => { cleanup(); route.pathname = '/' })

async function openNavigation() {
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Open navigation' })
  await user.click(trigger)
  return { user, trigger, navigation: screen.getByRole('navigation', { name: 'All pages' }) }
}

describe('public header navigation', () => {
  it('keeps joining and Leadership discoverable in the compact menu', async () => {
    render(<PublicHeader />)
    const { navigation } = await openNavigation()
    const menu = within(navigation)
    expect(menu.getByRole('link', { name: 'Join the club' })).toHaveAttribute('href', '/get-involved')
    expect(menu.getByRole('link', { name: 'Leadership' })).toHaveAttribute('href', '/leadership')
    expect(menu.getByRole('link', { name: 'Member sign in' })).toHaveAttribute('href', '/member/login')
  })

  it('preserves every CMS destination and label, including Home and Get involved', async () => {
    const items: PublicNavigationItem[] = [
      { label: 'Our home', destination: '/' },
      { label: 'Student projects', destination: '/projects' },
      { label: 'Get involved your way', destination: '/get-involved' },
      { label: 'Meet our officers', destination: '/leadership' },
      { label: 'Project resources', destination: '/resources?category=projects' },
      { label: 'Club partner', destination: 'https://example.org/club', external: true },
    ]
    render(<PublicHeader items={items} />)
    const { navigation } = await openNavigation()
    const menu = within(navigation)
    for (const item of items) {
      expect(menu.getByRole('link', { name: item.label })).toHaveAttribute('href', item.destination)
    }
    expect(navigation.querySelectorAll('a[href="/get-involved"]')).toHaveLength(1)
    expect(navigation.querySelectorAll('a[href="/leadership"]')).toHaveLength(1)
    const external = menu.getByRole('link', { name: 'Club partner' })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noreferrer')
  })

  it('adds essential destinations when a custom CMS menu omits them', async () => {
    render(<PublicHeader items={[{ label: 'News archive', destination: '/news' }]} />)
    const { navigation } = await openNavigation()
    const menu = within(navigation)
    expect(menu.getByRole('link', { name: 'News archive' })).toBeInTheDocument()
    for (const label of ['Join the club', 'Leadership', 'Member sign in']) {
      expect(menu.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('focuses the first link on opening and restores the trigger on Escape', async () => {
    render(<PublicHeader />)
    const { user, trigger, navigation } = await openNavigation()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', navigation.id)
    expect(within(navigation).getAllByRole('link')[0]).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes on outside pointer interaction without moving focus back to the trigger', async () => {
    render(<><PublicHeader /><button>Continue reading</button></>)
    const { user, trigger } = await openNavigation()
    const outside = screen.getByRole('button', { name: 'Continue reading' })
    await user.click(outside)
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(outside).toHaveFocus()
  })

  it('allows Tab to leave the nonmodal navigation and dismisses the panel', async () => {
    render(<><PublicHeader /><button>Continue reading</button></>)
    const { user, navigation } = await openNavigation()
    const links = within(navigation).getAllByRole('link')
    links.at(-1)?.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continue reading' })).toHaveFocus()
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
  })

  it('lets the trigger close the panel after opening it', async () => {
    render(<PublicHeader />)
    const { user, trigger } = await openNavigation()
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
  })

  it('dismisses on pathname changes and cannot revive an old open panel on return', async () => {
    const view = render(<PublicHeader />)
    await openNavigation()
    route.pathname = '/projects'
    view.rerender(<PublicHeader />)
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
    route.pathname = '/'
    view.rerender(<PublicHeader />)
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('dismisses on browser history navigation even when the pathname is unchanged', async () => {
    render(<PublicHeader />)
    await openNavigation()
    fireEvent(window, new PopStateEvent('popstate'))
    expect(screen.queryByRole('navigation', { name: 'All pages' })).not.toBeInTheDocument()
  })

  it('marks nested paths current without matching Home, sibling prefixes, or external links', async () => {
    route.pathname = '/projects/robot'
    const items: PublicNavigationItem[] = [
      { label: 'Home', destination: '/' },
      { label: 'Projects', destination: '/projects' },
      { label: 'Project', destination: '/project' },
      { label: 'External projects', destination: '/projects', external: true },
    ]
    render(<PublicHeader items={items} />)
    const { navigation } = await openNavigation()
    const menu = within(navigation)
    expect(menu.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page')
    for (const label of ['Home', 'Project', 'External projects']) {
      expect(menu.getByRole('link', { name: label })).not.toHaveAttribute('aria-current')
    }
  })

  it.each(['/projects/', '/projects?view=all', '/projects#featured'])(
    'recognizes the current page in a CMS destination with a suffix: %s',
    async (destination) => {
      route.pathname = '/projects'
      render(<PublicHeader items={[{ label: 'Our projects', destination }]} />)
      const { navigation } = await openNavigation()
      const link = within(navigation).getByRole('link', { name: 'Our projects' })
      expect(link).toHaveAttribute('href', destination.replace(/\/$/, ''))
      expect(link).toHaveAttribute('aria-current', 'page')
    },
  )

  it('marks Home current only on the homepage', async () => {
    render(<PublicHeader items={[{ label: 'Home', destination: '/' }]} />)
    const { navigation } = await openNavigation()
    expect(within(navigation).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps the server-rendered menu trigger disabled until hydration is ready', () => {
    const html = renderToString(<PublicHeader />)
    const document = new DOMParser().parseFromString(html, 'text/html')
    expect(document.querySelector('button[aria-label="Open navigation"]')?.hasAttribute('disabled')).toBe(true)
    expect(document.querySelector('#expanded-navigation')).toBeNull()
    render(<PublicHeader />)
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeEnabled()
  })
})
