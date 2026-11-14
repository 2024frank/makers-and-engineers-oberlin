import Link from 'next/link'
import { ArrowRight, CalendarPlus, FilePenLine, FolderPlus, Users } from 'lucide-react'
import type { CurrentAdmin } from '@/lib/auth/session'
import type { DashboardSummary } from '@/lib/cms/dashboard'
import { DashboardCards } from './DashboardCards'
import { ActivityFeed } from './ActivityFeed'

export function AdminDashboard({
  admin,
  summary,
  activity,
}: {
  admin: CurrentAdmin
  summary: DashboardSummary
  activity: { id: string; action: string; entity_type: string; entity_id: string; created_at: string }[]
}) {
  const actions = [
    {
      title: 'Add a project',
      detail: 'Start a project draft.',
      href: '/admin/projects?new=1',
      scope: 'projects',
      icon: FolderPlus,
    },
    ...(admin.role === 'EDITOR'
      ? []
      : [
          {
            title: 'Manage project teams',
            detail: 'Add members, pick leads, start projects.',
            href: '/admin/project-teams',
            scope: 'projects',
            icon: Users,
          },
        ]),
    {
      title: 'Post an event',
      detail: 'Set the details for a club event.',
      href: '/admin/events?new=1',
      scope: 'events',
      icon: CalendarPlus,
    },
    {
      title: 'Update the website',
      detail: 'Edit an existing page.',
      href: '/admin/pages',
      scope: 'pages',
      icon: FilePenLine,
    },
  ].filter(action => admin.role !== 'EDITOR' || admin.scopes.includes(action.scope))

  const quickButtons = [
    ...(admin.role !== 'EDITOR' || admin.scopes.includes('projects')
      ? [{ label: 'New project', href: '/admin/projects?new=1', primary: true }]
      : []),
    ...(admin.role !== 'EDITOR'
      ? [{ label: 'Email members', href: '/admin/email', primary: false }]
      : [
          ...(admin.scopes.includes('events')
            ? [{ label: 'Post event', href: '/admin/events?new=1', primary: false }]
            : []),
          ...(admin.scopes.includes('pages')
            ? [{ label: 'Edit website pages', href: '/admin/pages', primary: false }]
            : []),
        ].slice(0, 1)),
  ]

  const projectsHref = '/admin/projects'

  return (
    <main className="admin-panel portal-home">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Club administration</p>
          <h1>Operations overview</h1>
          <p>Review club requests, coordinate active teams, and publish upcoming programming.</p>
        </div>
        {quickButtons.length > 0 && (
          <div className="admin-quick-actions">
            {quickButtons.map(btn => (
              <Link
                key={btn.href}
                href={btn.href}
                className={btn.primary ? 'button button--primary' : 'button button--ghost'}
              >
                {btn.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="portal-section" aria-label="Club status">
        <div className="admin-kpi-grid">
          <Link className="admin-kpi-card" href={projectsHref}>
            <span>Active projects</span>
            <strong>{summary.activeProjects}</strong>
            <small>In build or recruiting</small>
          </Link>
          <Link className="admin-kpi-card" href="/admin/events">
            <span>Upcoming events</span>
            <strong>{summary.upcomingEvents}</strong>
            <small>Scheduled on calendar</small>
          </Link>
          <Link className="admin-kpi-card" href="/admin/opportunities">
            <span>Closing soon</span>
            <strong>{summary.closingOpportunities}</strong>
            <small>Deadlines in the next 14 days</small>
          </Link>
          <Link className="admin-kpi-card" href="/admin/pages">
            <span>Drafts &amp; scheduled</span>
            <strong>{summary.drafts + summary.scheduledPublications}</strong>
            <small>Website publishing queue</small>
          </Link>
        </div>
      </section>

      <DashboardCards summary={summary} role={admin.role} />

      <div className="admin-dashboard-grid">
        <ActivityFeed items={activity} />

        <section className="admin-card" aria-labelledby="admin-actions">
          <div className="portal-section-heading">
            <h2 id="admin-actions">Common tasks</h2>
          </div>
          <div className="portal-review-list">
            {actions.map(action => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <span className="portal-review-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.detail}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
