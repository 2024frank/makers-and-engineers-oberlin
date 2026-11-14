'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import type { PublicNavigationItem } from '@/lib/page-builder/publicPages'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useFormReady } from '@/components/member/useFormReady'

export type PublicNavInputItem = Partial<PublicNavigationItem> & {
  label: string
  href?: string
  destination?: string
  group?: string
  order?: number
}

export const publicNavigation: PublicNavigationItem[] = [
  { id: 'projects', label: 'Projects', destination: '/projects', sortOrder: 10 },
  { id: 'events', label: 'Events', destination: '/events', sortOrder: 20 },
  { id: 'pathway', label: '3-2 Pathway', destination: '/pathway', sortOrder: 30 },
  { id: 'capstone', label: 'Capstone', destination: '/capstone', sortOrder: 40 },
  { id: 'about', label: 'About', destination: '/about', sortOrder: 50 },
  { id: 'news', label: 'News', destination: '/news', sortOrder: 60 },
  { id: 'opportunities', label: 'Opportunities', destination: '/opportunities', sortOrder: 70 },
  { id: 'resources', label: 'Resources', destination: '/resources', sortOrder: 80 },
  { id: 'leadership', label: 'Leadership', destination: '/leadership', sortOrder: 90 },
  { id: 'get-involved', label: 'Join the club', destination: '/get-involved', sortOrder: 100 },
  { id: 'app', label: 'Get the app', destination: '/app', sortOrder: 110 },
]

type NavItemDetail = {
  href: string
  label: string
  description: string
  external?: boolean
}

type NavGroup = {
  id: 'projects' | 'community' | 'club'
  label: string
  items: NavItemDetail[]
}

const DEFAULT_DESCRIPTIONS: Record<string, { group: NavGroup['id']; description: string }> = {
  '/projects': { group: 'projects', description: 'Active hardware, software, and repair builds.' },
  '/pathway': { group: 'projects', description: 'Dual-degree engineering track and planning resources.' },
  '/capstone': { group: 'projects', description: 'Partnered longer-term engineering capstone builds.' },
  '/events': { group: 'community', description: 'Meetings, hands-on workshops, and speaker talks.' },
  '/news': { group: 'community', description: 'Dispatches from club builds and milestones.' },
  '/opportunities': { group: 'community', description: 'Internships, research openings, and fellowships.' },
  '/leadership': { group: 'community', description: 'Open officer positions and student leadership.' },
  '/about': { group: 'club', description: 'Charter, studio culture, and how the club works.' },
  '/resources': { group: 'club', description: 'CAD guides, partner schools, and workbench references.' },
  '/app': { group: 'club', description: 'The MEO Members Android companion portal.' },
}

const GROUP_META: Array<{ id: NavGroup['id']; label: string }> = [
  { id: 'projects', label: 'Projects' },
  { id: 'community', label: 'Community' },
  { id: 'club', label: 'Club' },
]

const CORE_DEFAULTS: NavItemDetail[] = [
  { href: '/projects', label: 'Projects', description: DEFAULT_DESCRIPTIONS['/projects'].description },
  { href: '/pathway', label: '3-2 Pathway', description: DEFAULT_DESCRIPTIONS['/pathway'].description },
  { href: '/capstone', label: 'Capstone', description: DEFAULT_DESCRIPTIONS['/capstone'].description },
  { href: '/events', label: 'Events', description: DEFAULT_DESCRIPTIONS['/events'].description },
  { href: '/news', label: 'News', description: DEFAULT_DESCRIPTIONS['/news'].description },
  { href: '/opportunities', label: 'Opportunities', description: DEFAULT_DESCRIPTIONS['/opportunities'].description },
  { href: '/leadership', label: 'Leadership', description: DEFAULT_DESCRIPTIONS['/leadership'].description },
  { href: '/about', label: 'About', description: DEFAULT_DESCRIPTIONS['/about'].description },
  { href: '/resources', label: 'Resources', description: DEFAULT_DESCRIPTIONS['/resources'].description },
  { href: '/app', label: 'Get the app', description: DEFAULT_DESCRIPTIONS['/app'].description },
]

function normalizeInternalPath(href?: string | null): string | null {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null
  const withoutHash = href.split('#')[0] ?? '/'
  const withoutQuery = withoutHash.split('?')[0] ?? '/'
  return withoutQuery.length > 1 && withoutQuery.endsWith('/')
    ? withoutQuery.slice(0, -1)
    : withoutQuery || '/'
}

function buildNavData(items?: PublicNavInputItem[]) {
  const cmsList = (items ?? [])
    .map(entry => ({
      ...entry,
      resolvedHref: entry.destination ?? entry.href ?? '',
    }))
    .filter(entry => entry.resolvedHref.length > 0)

  const cmsByPath = new Map<string, (typeof cmsList)[number]>()
  for (const item of cmsList) {
    if (item.external) continue
    const key = normalizeInternalPath(item.resolvedHref)
    if (key) cmsByPath.set(key, item)
  }

  const desktopBuckets: Record<NavGroup['id'], NavItemDetail[]> = {
    projects: [],
    community: [],
    club: [],
  }
  const drawerBuckets: Record<NavGroup['id'], NavItemDetail[]> = {
    projects: [],
    community: [],
    club: [],
  }

  const seenDesktop = new Set<string>(['/get-involved', '/member/login', '/'])
  const seenDrawer = new Set<string>(['/member/login', '/get-involved'])

  for (const fallback of CORE_DEFAULTS) {
    const override = cmsByPath.get(fallback.href)
    const meta = DEFAULT_DESCRIPTIONS[fallback.href]
    const entry: NavItemDetail = {
      href: override?.resolvedHref ?? fallback.href,
      label: override?.label ?? fallback.label,
      description: fallback.description,
      external: false,
    }
    seenDesktop.add(fallback.href)
    seenDrawer.add(fallback.href)
    desktopBuckets[meta.group].push(entry)
    drawerBuckets[meta.group].push(entry)
  }

  for (const custom of cmsList) {
    const normalized = custom.external ? null : normalizeInternalPath(custom.resolvedHref)
    const key = custom.external
      ? `ext:${custom.resolvedHref}:${custom.label}`
      : (normalized ?? custom.resolvedHref)
    const targetGroup: NavGroup['id'] =
      custom.group === 'explore' ? 'projects' : custom.group === 'resources' ? 'club' : 'community'

    if (!seenDrawer.has(key)) {
      seenDrawer.add(key)
      drawerBuckets[targetGroup].push({
        href: custom.resolvedHref,
        label: custom.label,
        description: custom.external ? 'External resource' : 'Explore club page',
        external: Boolean(custom.external),
      })
    }

    if (!seenDesktop.has(key)) {
      seenDesktop.add(key)
      desktopBuckets[targetGroup].push({
        href: custom.resolvedHref,
        label: custom.label,
        description: custom.external ? 'External resource' : 'Explore club page',
        external: Boolean(custom.external),
      })
    }
  }

  const joinOverride = cmsByPath.get('/get-involved')
  const desktopGroups = GROUP_META.map(meta => ({
    ...meta,
    items: desktopBuckets[meta.id],
  })).filter(group => group.items.length > 0)
  const drawerGroups = GROUP_META.map(meta => ({
    ...meta,
    items: drawerBuckets[meta.id],
  })).filter(group => group.items.length > 0)

  return {
    desktopGroups,
    drawerGroups,
    joinHref: joinOverride?.resolvedHref ?? '/get-involved',
    joinLabel: joinOverride?.label ?? 'Join the club',
  }
}

function NavLinkItem({
  link,
  isActive,
  className,
  role,
  onClick,
  children,
}: {
  link: NavItemDetail
  isActive: boolean
  className?: string
  role?: string
  onClick: () => void
  children: React.ReactNode
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        role={role}
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }
  return (
    <Link
      href={link.href}
      role={role}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}

export function PublicHeader({
  items,
  logoSrc,
}: {
  items?: PublicNavInputItem[]
  logoSrc?: string | null
}) {
  const rawPathname = usePathname() || '/'
  const currentPath = normalizeInternalPath(rawPathname) ?? '/'
  const ready = useFormReady()
  const [lastPathname, setLastPathname] = useState(rawPathname)
  const [navState, setNavState] = useState<{
    group: NavGroup['id'] | null
    mobile: boolean
  }>({ group: null, mobile: false })

  if (lastPathname !== rawPathname) {
    setLastPathname(rawPathname)
    if (navState.group !== null || navState.mobile) {
      setNavState({ group: null, mobile: false })
    }
  }

  const headerRef = useRef<HTMLElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const expandedRef = useRef<HTMLElement>(null)
  const navId = useId()
  const { desktopGroups, drawerGroups, joinHref, joinLabel } = buildNavData(items)

  const openGroup = navState.group
  const mobileOpen = navState.mobile

  const isActiveHref = (href: string) => {
    const clean = normalizeInternalPath(href)
    if (!clean) return false
    return clean === '/'
      ? currentPath === '/'
      : currentPath === clean || currentPath.startsWith(`${clean}/`)
  }

  const closeAll = () => setNavState({ group: null, mobile: false })

  useEffect(() => {
    if (mobileOpen) {
      expandedRef.current?.querySelector('a')?.focus()
    }
  }, [mobileOpen])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setNavState(prev => (prev.group || prev.mobile ? { group: null, mobile: false } : prev))
      }
    }
    function handleFocusIn(event: FocusEvent) {
      if ((mobileOpen || openGroup) && !headerRef.current?.contains(event.target as Node)) {
        setNavState({ group: null, mobile: false })
      }
    }
    function handlePopState() {
      setNavState({ group: null, mobile: false })
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (mobileOpen) {
        setNavState({ group: null, mobile: false })
        menuTriggerRef.current?.focus()
        return
      }
      if (openGroup) {
        const button = headerRef.current?.querySelector<HTMLButtonElement>(
          `button[data-nav-group="${openGroup}"]`,
        )
        setNavState({ group: null, mobile: false })
        button?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [mobileOpen, openGroup])

  function toggleMobileDrawer() {
    setNavState(prev => ({ group: null, mobile: !prev.mobile }))
  }

  return (
    <header className="public-header" ref={headerRef}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="shell public-header__inner">
        <Link
          className="public-header__brand"
          href="/"
          aria-label="Projects for Makers and Engineers home"
          aria-current={isActiveHref('/') ? 'page' : undefined}
          onClick={closeAll}
        >
          <BrandLogo variant="badge" src={logoSrc} />
          <span className="public-header__brand-text">
            <span className="public-header__brand-name">Projects for Makers and Engineers</span>
            <span className="public-header__brand-sub">Oberlin College</span>
          </span>
        </Link>

        <nav className="desktop-primary" aria-label="Primary navigation">
          {desktopGroups.map(group => {
            const isOpen = openGroup === group.id
            const groupActive = group.items.some(item => isActiveHref(item.href))
            const panelId = `${navId}-panel-${group.id}`
            return (
              <div className="nav-dropdown" key={group.id}>
                <button
                  type="button"
                  data-nav-group={group.id}
                  data-active={groupActive ? 'true' : undefined}
                  className="nav-dropdown__trigger"
                  disabled={!ready}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  aria-controls={panelId}
                  onClick={() =>
                    setNavState(prev => ({
                      group: prev.group === group.id ? null : group.id,
                      mobile: false,
                    }))
                  }
                >
                  <span>{group.label}</span>
                  <ChevronDown size={15} className="nav-dropdown__chevron" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="nav-dropdown__panel" id={panelId} role="menu" aria-label={group.label}>
                    {group.items.map(link => (
                      <NavLinkItem
                        key={`${link.href}:${link.label}:${link.external ? 'ext' : 'int'}`}
                        link={link}
                        isActive={isActiveHref(link.href)}
                        role="menuitem"
                        className="nav-dropdown__item"
                        onClick={closeAll}
                      >
                        <strong>
                          {link.label}
                        </strong>
                        <span>{link.description}</span>
                      </NavLinkItem>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="header-actions">
          <Link
            className="header-member"
            href="/member/login"
            aria-current={isActiveHref('/member') ? 'page' : undefined}
            onClick={closeAll}
          >
            Member sign in
          </Link>
          <Link
            className="header-join"
            href={joinHref}
            aria-current={isActiveHref(joinHref) ? 'page' : undefined}
            onClick={closeAll}
          >
            {joinLabel}
          </Link>
          <button
            ref={menuTriggerRef}
            type="button"
            className="public-menu"
            disabled={!ready}
            aria-expanded={mobileOpen}
            aria-controls="expanded-navigation"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={toggleMobileDrawer}
          >
            {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <span>Menu</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="expanded-navigation"
          ref={expandedRef}
          className="expanded-navigation"
          aria-label="All pages"
        >
          <div className="shell">
            <div className="expanded-navigation__grid">
              {drawerGroups.map(group => (
                <div className="expanded-navigation__group" key={group.id}>
                  <h3>{group.label}</h3>
                  <div className="expanded-navigation__links">
                    {group.items.map(link => (
                      <NavLinkItem
                        key={`${link.href}:${link.label}:${link.external ? 'ext' : 'int'}`}
                        link={link}
                        isActive={isActiveHref(link.href)}
                        onClick={closeAll}
                      >
                        <span>{link.label}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </NavLinkItem>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="expanded-navigation__footer">
              <Link
                className="button button--primary"
                href={joinHref}
                aria-current={isActiveHref(joinHref) ? 'page' : undefined}
                onClick={closeAll}
              >
                {joinLabel}
              </Link>
              <Link
                className="button button--ghost"
                href="/member/login"
                aria-current={isActiveHref('/member') ? 'page' : undefined}
                onClick={closeAll}
              >
                Member sign in
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
