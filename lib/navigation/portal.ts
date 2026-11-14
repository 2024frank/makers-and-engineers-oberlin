import type { AdminRole } from '@/lib/permissions/types'

export type PortalNavItem = { label: string; href: string; icon: string }
export type PortalNavGroup = { label: string; items: PortalNavItem[]; collapsed?: boolean }

/**
 * Streamlined Admin portal navigation.
 * Merges Projects + Project Teams into `/admin/projects`, consolidates approval queues
 * under `/admin/requests`, and unlocks email & studio customization for Admins.
 */
export function adminPortalGroups(role: AdminRole): PortalNavGroup[] {
  const isAdmin = role !== 'EDITOR'
  return [
    {
      label: 'Start here',
      items: [
        { label: 'Overview', href: '/admin', icon: 'home' },
        ...(isAdmin ? [{ label: 'Email members', href: '/admin/email', icon: 'mail' }] : []),
        ...(isAdmin ? [{ label: 'Inbox', href: '/admin/submissions', icon: 'inbox' }] : []),
        ...(isAdmin ? [{ label: 'Member requests', href: '/admin/member-applications', icon: 'people' }] : []),
        ...(isAdmin ? [{ label: 'Applications & ideas', href: '/admin/requests', icon: 'requests' }] : []),
      ],
    },
    {
      label: 'Projects & club',
      items: [
        { label: 'Projects', href: '/admin/projects', icon: 'projects' },
        ...(isAdmin ? [{ label: 'Club teams', href: '/admin/teams', icon: 'people' }] : []),
        ...(isAdmin ? [{ label: 'Members', href: '/admin/members', icon: 'people' }] : []),
        { label: 'Events', href: '/admin/events', icon: 'calendar' },
        { label: 'Project updates', href: '/admin/project-updates', icon: 'updates' },
      ],
    },
    {
      label: 'Website & studio',
      items: [
        { label: 'Website pages', href: '/admin/pages', icon: 'pages' },
        ...(isAdmin ? [{ label: 'Customize site', href: '/admin/customize', icon: 'palette' }] : []),
        { label: 'Media library', href: '/admin/media', icon: 'image' },
        ...(isAdmin ? [{ label: 'Navigation', href: '/admin/navigation', icon: 'navigation' }] : []),
      ],
    },
    {
      label: 'Directory & more',
      collapsed: true,
      items: [
        { label: 'Resources', href: '/admin/resources', icon: 'book' },
        { label: 'Opportunities', href: '/admin/opportunities', icon: 'briefcase' },
        { label: 'News', href: '/admin/news', icon: 'pages' },
        { label: 'Leadership', href: '/admin/leadership', icon: 'people' },
        { label: 'Collaborators', href: '/admin/sponsors', icon: 'briefcase' },
        { label: 'Documents', href: '/admin/documents', icon: 'pages' },
        { label: '3-2 schools', href: '/admin/partner-schools', icon: 'book' },
        ...(isAdmin ? [{ label: 'Redirects', href: '/admin/redirects', icon: 'navigation' }] : []),
      ],
    },
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            label: 'Settings',
            collapsed: true,
            items: [
              { label: 'Site settings', href: '/admin/settings', icon: 'settings' },
              { label: 'Staff access', href: '/admin/users', icon: 'shield' },
              { label: 'Activity log', href: '/admin/audit', icon: 'history' },
            ],
          },
        ]
      : []),
  ]
}

export const memberPortalGroups: PortalNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/member', icon: 'home' },
      { label: 'My teams', href: '/member/teams', icon: 'projects' },
      { label: 'Find a project', href: '/member/projects', icon: 'search' },
      { label: 'My ideas', href: '/member/proposals', icon: 'idea' },
    ],
  },
  {
    label: 'Inbox',
    items: [
      { label: 'Invitations', href: '/member/invitations', icon: 'inbox' },
      { label: 'Notifications', href: '/member/notifications', icon: 'bell' },
      { label: 'My applications', href: '/member/applications', icon: 'requests' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Find club teams', href: '/member/teams/find', icon: 'people' },
      { label: 'Member directory', href: '/member/directory', icon: 'book' },
      { label: 'Officer openings', href: '/member/leadership', icon: 'people' },
      { label: 'Saved items', href: '/member/saved', icon: 'bookmark' },
      { label: 'My profile', href: '/member/profile', icon: 'profile' },
      { label: 'Capstone', href: '/member/capstone', icon: 'briefcase' },
      { label: 'Club app', href: '/member/app', icon: 'phone' },
    ],
  },
]

export function portalPath(pathname: string, portal: 'admin' | 'member'): string {
  if (portal !== 'admin') return pathname
  return pathname === '/admin' || pathname.startsWith('/admin/')
    ? pathname
    : pathname === '/'
      ? '/admin'
      : `/admin${pathname}`
}

export function isPortalItemActive(pathname: string, href: string): boolean {
  if (href === '/admin' || href === '/member') return pathname === href
  if (href === '/member/teams') {
    return (
      pathname === '/member/teams' ||
      (pathname.startsWith('/member/teams/') && !pathname.startsWith('/member/teams/find'))
    )
  }
  if (href === '/admin/projects') {
    return (
      pathname === '/admin/projects' ||
      pathname.startsWith('/admin/projects/') ||
      pathname === '/admin/project-teams' ||
      pathname.startsWith('/admin/project-teams/')
    )
  }
  if (href === '/admin/requests') {
    return (
      pathname === '/admin/requests' ||
      pathname.startsWith('/admin/requests/') ||
      pathname.startsWith('/admin/project-proposals') ||
      pathname.startsWith('/admin/project-applications') ||
      pathname.startsWith('/admin/officer-applications') ||
      pathname.startsWith('/admin/capstone-applications')
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
