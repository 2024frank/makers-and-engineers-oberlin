import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { listSavedItems } from '@/lib/members/saves'

export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'ACTIVE_MEMBER_REQUIRED' }, { status: 401 })
  try { return NextResponse.json({ items: await listSavedItems(member.userId) }) }
  catch { return NextResponse.json({ error: 'SAVED_ITEMS_LOAD_FAILED' }, { status: 500 }) }
}
