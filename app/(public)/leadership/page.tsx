import type { Metadata } from 'next'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listOfficerPositions } from '@/lib/leadership/server'
import { OfficerPositions } from '@/components/leadership/OfficerPositions'
import '@/components/leadership/leadership.css'
import { publicPreviewEnabled } from '@/lib/content/previewProjects'

export const metadata: Metadata = { title: 'Open officer positions' }

export default async function LeadershipPage() {
  if (publicPreviewEnabled()) return <section className="directory"><div className="shell"><header className="leadership-heading"><p className="eyebrow">Makers and Engineers @Oberlin</p><h1>Open officer positions</h1></header><div className="empty-state"><h2>Officer openings are unavailable in this preview.</h2><p>Current positions and applications require a connection to the club’s live data.</p></div></div></section>
  const [positions, member] = await Promise.all([listOfficerPositions(), getCurrentMember()])
  return <section className="leadership-page shell">
    <header className="leadership-heading"><p className="eyebrow">Makers and Engineers @Oberlin</p><h1>Open officer positions</h1></header>
    <OfficerPositions positions={positions} signedIn={Boolean(member)}/>
  </section>
}
