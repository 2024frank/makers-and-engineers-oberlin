'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { isPortalItemActive, portalPath, type PortalNavGroup } from '@/lib/navigation/portal'
import { PortalNavIcon } from './PortalNavIcon'
import { usePortalRail } from './PortalRailContext'

export function PortalSidebar({
  portal,
  groups,
  displayName,
  roleLabel,
  badges: propBadges,
  onNavigate: propOnNavigate,
}: {
  portal: 'admin' | 'member'
  groups: PortalNavGroup[]
  displayName?: string
  roleLabel?: string
  badges?: Record<string, number>
  onNavigate?: () => void
}) {
  const rawPathname = usePathname() || '/'
  const pathname = portalPath(rawPathname, portal)
  const [query, setQuery] = useState('')
  const rail = usePortalRail()

  const collapsed = rail && !rail.inDrawer ? rail.collapsed : false
  const badges = propBadges ?? rail?.badges
  const onNavigate = propOnNavigate ?? rail?.onNavigate

  const normalizedQuery = query.trim().toLowerCase()
  const visibleGroups = normalizedQuery
    ? groups
        .map(group => ({
          ...group,
          items: group.items.filter(
            item =>
              item.label.toLowerCase().includes(normalizedQuery) ||
              group.label.toLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter(group => group.items.length > 0)
    : groups

  const renderGroupLinks = (group: PortalNavGroup) => (
    <nav aria-label={group.label}>
      {group.items.map(item => {
        const active = isPortalItemActive(pathname, item.href)
        const count = badges?.[item.href] ?? 0
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <PortalNavIcon name={item.icon} size={17} />
            <span className="portal-nav-label">{item.label}</span>
            {count > 0 && (
              <span className="portal-nav-badge" aria-hidden="true">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const homeHref = portal === 'admin' ? '/admin' : '/member'
  const portalTitle = portal === 'admin' ? 'Officer portal' : 'Member portal'
  const userName = displayName?.trim() || (portal === 'admin' ? 'Officer' : 'Member')
  const userInitial = userName.slice(0, 1).toUpperCase()

  return (
    <aside
      className={portal === 'admin' ? 'admin-sidebar' : 'member-sidebar'}
      aria-label={`${portal === 'admin' ? 'Officer' : 'Member'} portal navigation`}
    >
      <div className="portal-rail-head">
        <Link
          href={homeHref}
          className={portal === 'admin' ? 'admin-sidebar__brand' : 'member-sidebar__brand'}
          onClick={onNavigate}
        >
          <BrandLogo variant="badge" />
          <span className="portal-rail-title">
            <strong>{portalTitle}</strong>
            <small>Oberlin Engineering</small>
          </span>
        </Link>
        {rail && !rail.inDrawer && rail.onToggleCollapse && (
          <button
            type="button"
            className="portal-rail-collapse"
            aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={rail.onToggleCollapse}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div className="portal-nav-filter">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          aria-label={`Find a ${portal} page`}
          placeholder="Find a page…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {query && visibleGroups.length > 0 && (
          <button
            type="button"
            aria-label="Clear navigation search"
            title="Clear navigation search"
            onClick={() => setQuery('')}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="portal-nav-groups">
        {visibleGroups.length > 0 ? (
          visibleGroups.map(group =>
            group.collapsed ? (
              <details
                key={`${group.label}-${normalizedQuery ? 'search' : pathname}`}
                className="portal-nav-group"
                open={
                  Boolean(normalizedQuery) ||
                  group.items.some(item => isPortalItemActive(pathname, item.href)) ||
                  undefined
                }
              >
                <summary className="portal-nav-group__toggle">
                  <span>{group.label}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </summary>
                {renderGroupLinks(group)}
              </details>
            ) : (
              <section key={group.label} className="portal-nav-group" aria-label={group.label}>
                <p className="portal-nav-group__label">{group.label}</p>
                {renderGroupLinks(group)}
              </section>
            ),
          )
        ) : (
          <div className="portal-nav-empty">
            <p>No matching pages.</p>
            <button type="button" onClick={() => setQuery('')}>
              Clear navigation search
            </button>
          </div>
        )}
      </div>

      <div className={portal === 'admin' ? 'admin-sidebar__footer' : 'member-sidebar__footer'}>
        <div className="portal-user-chip">
          <span className="portal-user-avatar" aria-hidden="true">
            {userInitial}
          </span>
          <div className="portal-user-meta">
            <strong>{userName}</strong>
            <small>{roleLabel ?? 'Club member'}</small>
          </div>
        </div>
      </div>
    </aside>
  )
}
