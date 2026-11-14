'use client'

import { useState } from 'react'
import { Briefcase, FolderKanban, Lightbulb, Users } from 'lucide-react'
import type { ProjectProposalSummary } from '@/lib/projects/proposalServer'
import type { ProjectApplication } from '@/lib/projects/applications'
import type { OfficerApplication, OfficerEmailStatus } from '@/lib/leadership/types'
import type { CapstoneApplication } from '@/lib/capstone/types'
import { ProjectProposalQueue } from '@/components/admin/projects/ProjectProposalQueue'
import { ProjectApplicationQueue } from '@/components/admin/projects/ProjectApplicationQueue'
import { OfficerApplicationQueue } from '@/components/leadership/OfficerApplicationQueue'
import { OfficerEmailDelivery } from '@/components/admin/leadership/EmailStatus'
import { CapstoneApplicationQueue } from '@/components/capstone/CapstoneApplicationQueue'

type TabKey = 'proposals' | 'projects' | 'officers' | 'capstone'

export function AdminRequestsHub({
  proposals,
  projectApplications,
  officerApplications,
  emailStatus,
  capstoneApplications,
  initialTab = 'proposals',
}: {
  proposals: ProjectProposalSummary[]
  projectApplications: ProjectApplication[]
  officerApplications: OfficerApplication[]
  emailStatus: OfficerEmailStatus[]
  capstoneApplications: CapstoneApplication[]
  initialTab?: TabKey
}) {
  const [tab, setTab] = useState<TabKey>(initialTab)

  const pendingProposals = proposals.filter(item => item.status === 'PENDING').length
  const pendingOfficers = officerApplications.filter(item => item.status === 'PENDING').length

  const tabs: Array<{ id: TabKey; label: string; count: number; icon: typeof Lightbulb }> = [
    { id: 'proposals', label: 'Project ideas', count: pendingProposals, icon: Lightbulb },
    { id: 'projects', label: 'Project applications', count: projectApplications.length, icon: FolderKanban },
    { id: 'officers', label: 'Officer applications', count: pendingOfficers, icon: Users },
    { id: 'capstone', label: 'Capstone', count: capstoneApplications.length, icon: Briefcase },
  ]

  return (
    <div>
      <div className="pt-chips" role="tablist" aria-label="Application and idea queues" style={{ marginBottom: 18 }}>
        {tabs.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className="pt-chip"
              onClick={() => setTab(item.id)}
            >
              <Icon size={15} /> {item.label}
              {item.count > 0 && <span>{item.count}</span>}
            </button>
          )
        })}
      </div>

      {tab === 'proposals' && <ProjectProposalQueue initial={proposals} />}
      {tab === 'projects' && <ProjectApplicationQueue initialRows={projectApplications} />}
      {tab === 'officers' && (
        <div className="leadership-page">
          <OfficerApplicationQueue applications={officerApplications} />
          <OfficerEmailDelivery rows={emailStatus} />
        </div>
      )}
      {tab === 'capstone' && <CapstoneApplicationQueue applications={capstoneApplications} />}
    </div>
  )
}
