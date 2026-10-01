import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { deleteClubTeam, performTeamAction } from '@/lib/teams/server'
import { teamActionSchema, teamError } from '@/lib/teams/input'
import { z } from 'zod'

export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const parsed = teamActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.action !== 'review-project') return NextResponse.json({ error: 'Choose a project request and a review decision.' }, { status: 400 })
  try { return NextResponse.json({ ok: true, result: await performTeamAction(parsed.data) }) }
  catch (error) { return NextResponse.json({ error: teamError(error) }, { status: 400 }) }
}

const deleteSchema = z.object({ teamId: z.string().uuid(), confirmName: z.string().max(300) }).strict()

// Permanent delete of a club team after the officer types its name. The database function re-checks the Admin role.
export async function DELETE(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Type the team name to confirm.' }, { status: 400 })
  try { return NextResponse.json({ ok: true, result: await deleteClubTeam(parsed.data.teamId, parsed.data.confirmName) }) }
  catch (error) { return NextResponse.json({ error: teamError(error) }, { status: 400 }) }
}
