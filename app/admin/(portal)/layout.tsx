import { AdminShell } from '@/components/admin/AdminShell'
import { ToastProvider } from '@/components/ui/Toast'
import { requireAdmin } from '@/lib/auth/requireRole'
import { getDashboardSummary } from '@/lib/cms/dashboard'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  const summary = await getDashboardSummary(admin.role).catch(() => null)
  const badges: Record<string, number> | undefined = summary
    ? {
        '/admin/submissions': summary.newSubmissions,
        '/admin/member-applications': summary.pendingMemberApprovals,
        '/admin/requests': summary.pendingProjectProposals + summary.pendingProjectApplications,
        '/admin/project-proposals': summary.pendingProjectProposals,
        '/admin/project-applications': summary.pendingProjectApplications,
        '/admin/project-updates': summary.pendingProjectUpdateReviews,
      }
    : undefined

  return (
    <ToastProvider>
      <AdminShell admin={admin} badges={badges}>
        {children}
      </AdminShell>
    </ToastProvider>
  )
}
