import type { CurrentAdmin } from '@/lib/auth/session'
import { PortalShell } from '@/components/portal/PortalShell'
import { adminPortalGroups } from '@/lib/navigation/portal'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({
  admin,
  badges,
  children,
}: {
  admin: CurrentAdmin
  badges?: Record<string, number>
  children: React.ReactNode
}) {
  return (
    <PortalShell
      portal="admin"
      groups={adminPortalGroups(admin.role)}
      badges={badges}
      sidebar={<AdminSidebar admin={admin} badges={badges} />}
    >
      {children}
    </PortalShell>
  )
}
