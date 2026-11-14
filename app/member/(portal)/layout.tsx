import { requireActiveMember } from '@/lib/auth/memberSession'
import { MemberShell } from '@/components/member/MemberShell'
import { getMemberDashboardSummary, getUnreadNotificationCount } from '@/lib/members/dashboard'

export const dynamic = 'force-dynamic'

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const member = await requireActiveMember()
  const [unread, summary] = await Promise.all([
    getUnreadNotificationCount(member.userId).catch(() => 0),
    getMemberDashboardSummary(member.userId).catch(() => null),
  ])

  const badges: Record<string, number> = {
    '/member/invitations': summary?.pendingInvitations ?? 0,
    '/member/notifications': unread,
  }

  return (
    <MemberShell
      member={{ displayName: member.displayName, email: member.email }}
      unreadNotifications={unread}
      badges={badges}
    >
      {children}
    </MemberShell>
  )
}
