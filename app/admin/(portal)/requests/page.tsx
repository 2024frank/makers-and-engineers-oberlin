import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { AdminRequestsHub } from '@/components/admin/AdminRequestsHub'
import { requireAdmin } from '@/lib/auth/requireRole'
import { listPendingProjectProposals } from '@/lib/projects/proposalServer'
import { listAdminProjectApplications } from '@/lib/projects/applications'
import { listOfficerApplications, listOfficerEmailStatus } from '@/lib/leadership/server'
import { listCapstoneApplications } from '@/lib/capstone/server'
import '@/components/leadership/leadership.css'
import '@/components/projects/project-teams.css'

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') {
    return (
      <AccessDenied
        title="Admin access required"
        body="Only Admins and Super Admins can review project ideas, team applications, and officer applications."
      />
    )
  }

  const [params, proposals, projectApplications, officerApplications, emailStatus, capstoneApplications] =
    await Promise.all([
      searchParams,
      listPendingProjectProposals(),
      listAdminProjectApplications(),
      listOfficerApplications(),
      listOfficerEmailStatus(),
      listCapstoneApplications(),
    ])

  const tabParam = typeof params.tab === 'string' ? params.tab : ''
  const initialTab =
    tabParam === 'projects' || tabParam === 'officers' || tabParam === 'capstone'
      ? tabParam
      : 'proposals'

  return (
    <main className="admin-panel pt-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Reviews & queues</p>
          <h1>Applications & ideas</h1>
          <p>Review member project proposals, team join requests, officer applications, and CED capstone interest in one place.</p>
        </div>
      </div>
      <AdminRequestsHub
        proposals={proposals}
        projectApplications={projectApplications}
        officerApplications={officerApplications}
        emailStatus={emailStatus}
        capstoneApplications={capstoneApplications}
        initialTab={initialTab}
      />
    </main>
  )
}
