'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Bell, Menu, Search, X } from 'lucide-react'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { isPortalItemActive, portalPath, type PortalNavGroup } from '@/lib/navigation/portal'
import { PortalCommandPalette } from './PortalCommandPalette'
import { PortalRailContext } from './PortalRailContext'

const RAIL_STORAGE_KEY = 'oec-portal-rail-collapsed'
const railListeners = new Set<() => void>()
let railCollapsedMemory = false

function subscribeRailCollapse(listener: () => void) {
  railListeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === RAIL_STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    railListeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getRailCollapsedSnapshot() {
  try {
    const stored = window.localStorage.getItem(RAIL_STORAGE_KEY)
    if (stored === 'true' || stored === 'false') {
      railCollapsedMemory = stored === 'true'
    }
  } catch {
    // Fall back to in-memory state when localStorage is unavailable.
  }
  return railCollapsedMemory
}

function setRailCollapsedStorage(next: boolean) {
  railCollapsedMemory = next
  try {
    window.localStorage.setItem(RAIL_STORAGE_KEY, next ? 'true' : 'false')
  } catch {
    // Ignore storage write failures cleanly.
  }
  railListeners.forEach(listener => listener())
}

export function PortalShell({
  portal,
  groups,
  sidebar,
  badges,
  unreadNotifications = 0,
  children,
}: {
  portal: 'admin' | 'member'
  groups: PortalNavGroup[]
  sidebar: ReactNode
  badges?: Record<string, number>
  unreadNotifications?: number
  children: ReactNode
}) {
  const rawPathname = usePathname() || '/'
  const pathname = portalPath(rawPathname, portal)
  const [open, setOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  const railCollapsed = useSyncExternalStore(
    subscribeRailCollapse,
    getRailCollapsedSnapshot,
    () => false,
  )

  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const cmdTriggerRef = useRef<HTMLButtonElement>(null)

  const activeItem = groups
    .flatMap(group => group.items)
    .find(item => isPortalItemActive(pathname, item.href))
  const currentSectionLabel = activeItem?.label ?? (portal === 'admin' ? 'Overview' : 'Dashboard')
  const portalTitle = portal === 'admin' ? 'Officer portal' : 'Member portal'
  const openNavLabel = portal === 'admin' ? 'Open portal navigation' : 'Open member navigation'
  const closeNavLabel = portal === 'admin' ? 'Close portal navigation' : 'Close member navigation'
  const mobileNavId = `${portal}-mobile-navigation`

  function closeDrawer() {
    setOpen(false)
    const element = dialogRef.current
    if (element) {
      if (typeof element.close === 'function') element.close()
      else element.removeAttribute('open')
    }
    triggerRef.current?.focus()
  }

  useEffect(() => {
    const element = dialogRef.current
    if (!element) return
    if (open) {
      if (!element.open) {
        if (typeof element.showModal === 'function') element.showModal()
        else element.setAttribute('open', '')
      }
      closeBtnRef.current?.focus()
    } else if (element.open || element.hasAttribute('open')) {
      if (typeof element.close === 'function') element.close()
      else element.removeAttribute('open')
    }
  }, [open])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(min-width: 961px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className={portal === 'admin' ? 'admin-shell' : 'member-shell'}
      data-rail-collapsed={railCollapsed ? 'true' : undefined}
    >
      <PortalRailContext.Provider
        value={{
          collapsed: railCollapsed,
          onToggleCollapse: () => setRailCollapsedStorage(!railCollapsed),
          badges,
          inDrawer: false,
        }}
      >
        {sidebar}
      </PortalRailContext.Provider>

      <div className={portal === 'admin' ? 'admin-workspace' : 'member-shell__workspace'}>
        <header className={portal === 'admin' ? 'admin-topbar' : 'member-shell__topbar'}>
          <div className="portal-topbar__left">
            <button
              ref={triggerRef}
              type="button"
              className="portal-mobile-toggle"
              aria-label={openNavLabel}
              aria-expanded={open}
              aria-controls={mobileNavId}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="portal-breadcrumb" aria-label="Current portal section">
              <span>{portalTitle}</span>
              <span aria-hidden="true">/</span>
              <strong>{currentSectionLabel}</strong>
            </div>
          </div>

          <div className="portal-topbar__right">
            <button
              ref={cmdTriggerRef}
              type="button"
              className="portal-cmd-trigger"
              aria-label="Quick jump (Command+K)"
              onClick={() => setCmdOpen(true)}
            >
              <Search size={14} aria-hidden="true" />
              <span>Jump to…</span>
              <kbd>⌘K</kbd>
            </button>

            {portal === 'member' && (
              <Link
                className="portal-bell-link"
                href="/member/notifications"
                aria-label={
                  unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'
                }
                title="Notifications"
              >
                <Bell size={18} aria-hidden="true" />
                {unreadNotifications > 0 && (
                  <span className="portal-bell-badge" aria-hidden="true">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <a
              className="portal-site-link"
              href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://makeoberlin.site/'}
              target="_blank"
              rel="noreferrer"
              aria-label="View club website"
              title="Club website"
            >
              <span>Club website</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>

            <SignOutButton portal={portal} />
          </div>
        </header>

        <div id="main-content" className="portal-workspace-body">
          {children}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id={mobileNavId}
        className="portal-mobile-dialog"
        aria-label={`${portal === 'admin' ? 'Admin' : 'Member'} navigation`}
        onCancel={event => {
          event.preventDefault()
          closeDrawer()
        }}
        onClick={event => {
          if (event.target === dialogRef.current) closeDrawer()
        }}
      >
        <div className="portal-mobile-dialog__inner">
          <div className="portal-mobile-dialog__close-bar">
            <span>{portalTitle}</span>
            <button ref={closeBtnRef} type="button" aria-label={closeNavLabel} onClick={closeDrawer}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {open ? (
            <PortalRailContext.Provider
              value={{
                collapsed: false,
                badges,
                inDrawer: true,
                onNavigate: closeDrawer,
              }}
            >
              {sidebar}
            </PortalRailContext.Provider>
          ) : null}
        </div>
      </dialog>

      <PortalCommandPalette
        portal={portal}
        groups={groups}
        badges={badges}
        open={cmdOpen}
        onClose={() => {
          setCmdOpen(false)
          cmdTriggerRef.current?.focus()
        }}
      />
    </div>
  )
}
