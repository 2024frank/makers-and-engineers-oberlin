import type { CurrentAdmin } from '@/lib/auth/session'
import { PortalSidebar } from '@/components/portal/PortalSidebar'
import { adminPortalGroups } from '@/lib/navigation/portal'

export function AdminSidebar({
  admin,
  badges,
  onNavigate,
}: {
  admin: CurrentAdmin
  badges?: Record<string, number>
  onNavigate?: () => void
}) {
  const roleLabel =
    admin.role === 'SUPER_ADMIN'
      ? 'Super admin'
      : admin.role === 'ADMIN'
        ? 'Administrator'
        : 'Editor'

  return (
    <PortalSidebar
      portal="admin"
      groups={adminPortalGroups(admin.role)}
      displayName={admin.displayName}
      roleLabel={roleLabel}
      badges={badges}
      onNavigate={onNavigate}
    />
  )
}
