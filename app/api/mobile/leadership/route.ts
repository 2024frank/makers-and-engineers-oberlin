import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listOfficerApplications, listOfficerPositions } from '@/lib/leadership/server'
import { isPositionOpen } from '@/components/leadership/shared'

/** Open officer positions and this member's applications. Apply and withdraw use POST /api/member/leadership. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  const [positions, applications] = await Promise.all([listOfficerPositions(), listOfficerApplications()])
  return NextResponse.json({ positions: positions.filter(isPositionOpen), applications: applications.filter(application => application.userId === member.userId) })
}
