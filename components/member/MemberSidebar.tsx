import { PortalSidebar } from '@/components/portal/PortalSidebar'
import { memberPortalGroups } from '@/lib/navigation/portal'

export function MemberSidebar({
  displayName,
  badges,
  onNavigate,
}: {
  displayName?: string
  badges?: Record<string, number>
  onNavigate?: () => void
}) {
  return (
    <PortalSidebar
      portal="member"
      groups={memberPortalGroups}
      displayName={displayName}
      badges={badges}
      onNavigate={onNavigate}
    />
  )
}
