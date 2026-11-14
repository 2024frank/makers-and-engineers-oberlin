import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const ENTITY_NAMES: Record<string, string> = {
  page: 'Website page',
  pages: 'Website page',
  project: 'Project',
  projects: 'Project',
  event: 'Event',
  events: 'Event',
  opportunity: 'Opportunity',
  opportunities: 'Opportunity',
  submission: 'Submission',
  submissions: 'Submission',
  member: 'Member account',
  members: 'Member account',
  team: 'Club team',
  project_team: 'Project team',
  project_proposal: 'Project proposal',
  project_application: 'Project application',
  project_update: 'Project update',
  navigation: 'Navigation menu',
  site_settings: 'Site settings',
  media: 'Media asset',
  news: 'News post',
  document: 'Document',
  resource: 'Resource',
  sponsor: 'Sponsor',
}

export function ActivityFeed({
  items,
}: {
  items: { id: string; action: string; entity_type: string; entity_id: string; created_at: string }[]
}) {
  return (
    <section className="admin-card">
      <div className="portal-section-heading">
        <h2>Recent activity</h2>
        <Link href="/admin/audit">
          Full history <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {items.length ? (
        <ol className="activity-feed">
          {items.map(item => (
            <li key={item.id}>
              <span>{item.action.replaceAll('_', ' ').toLowerCase()}</span>
              <div>
                <strong>{ENTITY_NAMES[item.entity_type] ?? item.entity_type.replaceAll('_', ' ')}</strong>
              </div>
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="portal-muted">No recent activity.</p>
      )}
    </section>
  )
}
