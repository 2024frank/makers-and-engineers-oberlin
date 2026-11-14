import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { AdminEmailComposer } from '@/components/admin/email/AdminEmailComposer'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { getAdminEmailConsoleData } from '@/lib/email/adminBroadcast'
import '@/components/projects/project-teams.css'

export default async function AdminEmailPage() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'SEND_EMAIL')) {
    return (
      <AccessDenied
        title="Admin access required"
        body="Only Admins and Super Admins can email club members and project groups."
      />
    )
  }

  const data = await getAdminEmailConsoleData()
  return (
    <main className="admin-panel pt-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Club messaging</p>
          <h1>Email members</h1>
          <p>
            Send announcements, project instructions, images, and resource links directly to
            individuals, project teams, club tracks, or everyone in the club.
          </p>
        </div>
      </div>
      <AdminEmailComposer
        senderEmail={admin.email}
        recipients={data.recipients}
        groups={data.groups}
        initialHistory={data.history}
        initialMedia={data.imageAssets}
      />
    </main>
  )
}
