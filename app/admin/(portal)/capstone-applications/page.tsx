import { requireAdmin } from '@/lib/auth/requireRole'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { listCapstoneApplications } from '@/lib/capstone/server'
import { CapstoneApplicationQueue } from '@/components/capstone/CapstoneApplicationQueue'
import '@/components/leadership/leadership.css'

export default async function CapstoneApplicationsPage() {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return <AccessDenied title="Admin access required" body="Capstone applications are available to Admins and Super Admins."/>
  return <main className="admin-panel leadership-page">
    <div className="admin-page-heading"><h1>Capstone applications</h1></div>
    <CapstoneApplicationQueue applications={await listCapstoneApplications()}/>
  </main>
}
