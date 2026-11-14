import { PortalShell } from '@/components/portal/PortalShell'
import { memberPortalGroups } from '@/lib/navigation/portal'
import { MemberSidebar } from './MemberSidebar'

export function MemberShell({
  member,
  unreadNotifications = 0,
  badges,
  children,
}: {
  member: { displayName: string; email: string }
  unreadNotifications?: number
  badges?: Record<string, number>
  children: React.ReactNode
}) {
  const mergedBadges: Record<string, number> = {
    ...badges,
    '/member/notifications': badges?.['/member/notifications'] ?? unreadNotifications,
  }

  return (
    <PortalShell
      portal="member"
      groups={memberPortalGroups}
      badges={mergedBadges}
      unreadNotifications={unreadNotifications}
      sidebar={<MemberSidebar displayName={member.displayName} badges={mergedBadges} />}
    >
      {children}
    </PortalShell>
  )
}
