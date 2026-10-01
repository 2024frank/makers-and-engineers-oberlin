import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listAdminUsers, removeAdminUser, updateAdminUser } from '@/lib/auth/adminUsers'

export async function GET() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  return NextResponse.json({ users: await listAdminUsers() })
}

export async function POST() {
  return NextResponse.json({ error: 'USE_STAFF_INVITATIONS' }, { status: 410 })
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    await updateAdminUser(await request.json(), admin.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ADMIN_UPDATE_FAILED' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'MANAGE_USERS')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return NextResponse.json({ error: 'ADMIN_USER_NOT_FOUND' }, { status: 400 })
  try {
    await removeAdminUser(userId, admin.userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ADMIN_REMOVE_FAILED' }, { status: 400 })
  }
}
