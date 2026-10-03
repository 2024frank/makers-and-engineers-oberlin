import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { getMemberProfileSettings } from '@/lib/members/profile'

/** The member's profile and directory privacy settings. Saving uses PUT /api/member/profile. */
export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  return NextResponse.json({ profile: await getMemberProfileSettings(member.userId) })
}
