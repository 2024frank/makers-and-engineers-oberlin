import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { getAdminStudioCustomization, saveStudioCustomization } from '@/lib/cms/studioCustomization'

export async function GET() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'CUSTOMIZE_SITE')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    return NextResponse.json({ settings: await getAdminStudioCustomization() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'STUDIO_LOAD_FAILED' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (!can(admin.role, 'CUSTOMIZE_SITE')) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    const settings = await saveStudioCustomization(body, admin.userId)
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'STUDIO_SAVE_FAILED' },
      { status: 400 },
    )
  }
}
