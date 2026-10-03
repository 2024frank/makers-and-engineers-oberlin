/** Map a portal path from a notification (for example /member/teams/<id>) to the matching app route, or null when the app has none. */
export function appRoute(actionUrl: string | null): string | null {
  if (!actionUrl) return null
  let path = actionUrl
  if (/^https?:\/\//i.test(path)) { try { const url = new URL(path); path = url.pathname + url.search } catch { return null } }
  const [pathname, query = ''] = path.split('#')[0].split('?')
  const clean = pathname.replace(/\/+$/, '')
  const simple: Record<string, string> = {
    '/member': '/home', '/member/notifications': '/home/notifications', '/member/projects': '/projects', '/member/saved': '/projects/saved',
    '/member/applications': '/projects/applications', '/member/invitations': '/projects/invitations', '/member/proposals': '/projects/proposals',
    '/member/teams': '/teams', '/member/teams/find': '/teams/find', '/member/teams/new': '/teams/new',
    '/member/directory': '/directory', '/member/profile': '/more/profile', '/member/leadership': '/more/leadership',
  }
  if (simple[clean]) return clean === '/member/leadership' && query ? `${simple[clean]}?${query}` : simple[clean]
  const group = /^\/member\/teams\/group\/([\w-]+)$/.exec(clean)
  if (group) return `/teams/group/${group[1]}`
  const team = /^\/member\/teams\/([\w-]+)$/.exec(clean)
  if (team) return `/teams/${team[1]}`
  const project = /^\/member\/projects\/([\w-]+)$/.exec(clean)
  if (project) return `/projects/${project[1]}`
  return null
}
