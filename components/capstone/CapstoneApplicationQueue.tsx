'use client'

import { useState } from 'react'
import { Check, FileText } from 'lucide-react'
import { LeadershipDate } from '@/components/leadership/shared'
import { useLeadershipAction } from '@/components/leadership/useLeadershipAction'
import { capstoneStatusLabels, type CapstoneApplication, type CapstoneStatus } from '@/lib/capstone/types'

function Application({ application }: { application: CapstoneApplication }) {
  const { run, busy, error } = useLeadershipAction('/api/admin/capstone')
  return <article className="leadership-application" aria-label={`${application.displayName} capstone application`}>
    <header><div><h3>{application.displayName}</h3><p className="leadership-meta"><a href={`mailto:${application.email}`}>{application.email}</a></p></div></header>
    <p className="leadership-meta">{capstoneStatusLabels[application.status]} <LeadershipDate value={application.submittedAt}/></p>
    <h4>Area of interest</h4><p className="leadership-copy">{application.areaOfInterest}</p>
    <h4>What they want to work on</h4><p className="leadership-copy">{application.interests}</p>
    <h4>Company in mind</h4><p className="leadership-copy">{application.company || 'None given'}</p>
    <div className="leadership-actions">
      <a className="portal-text-link" href={`/api/capstone/resume?user=${application.userId}`} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true"/>{application.resumeName || 'Resume'}</a>
      {application.status === 'PENDING' && <button type="button" className="button button--secondary" disabled={busy} onClick={() => run({ userId: application.userId })}><Check size={17} aria-hidden="true"/>{busy ? 'Saving...' : 'Mark reviewed'}</button>}
    </div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
  </article>
}

const FILTERS: Array<CapstoneStatus | 'ALL'> = ['PENDING', 'REVIEWED', 'WITHDRAWN', 'ALL']

export function CapstoneApplicationQueue({ applications }: { applications: CapstoneApplication[] }) {
  const [filter, setFilter] = useState<CapstoneStatus | 'ALL'>('PENDING')
  const shown = filter === 'ALL' ? applications : applications.filter(application => application.status === filter)
  return <div className="leadership-queue">
    <div className="leadership-filters" role="group" aria-label="Filter applications">
      {FILTERS.map(value => <button key={value} type="button" className={`button ${filter === value ? 'button--primary' : 'button--ghost'}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'ALL' ? 'All' : capstoneStatusLabels[value]} ({value === 'ALL' ? applications.length : applications.filter(application => application.status === value).length})</button>)}
    </div>
    {shown.length ? shown.map(application => <Application key={`${application.userId}:${application.status}:${application.submittedAt}`} application={application}/>) : <p className="leadership-empty">No applications here.</p>}
  </div>
}
