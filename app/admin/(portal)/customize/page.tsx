import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { SiteCustomizationForm } from '@/components/admin/system/SiteCustomizationForm'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { listMedia } from '@/lib/cms/media'
import { getAdminStudioCustomization } from '@/lib/cms/studioCustomization'

export default async function CustomizeSitePage() {
  const admin = await requireAdmin()
  if (!can(admin.role, 'CUSTOMIZE_SITE')) {
    return (
      <AccessDenied
        title="Admin access required"
        body="Only Admins and Super Admins can customize the website theme, hero, and announcements."
      />
    )
  }

  const [initial, mediaAssets] = await Promise.all([
    getAdminStudioCustomization(),
    listMedia('').catch(() => []),
  ])

  return (
    <main className="admin-panel">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Website & studio</p>
          <h1>Customize site</h1>
          <p>
            Update the club accent theme, homepage hero copy and imagery, announcement bar, and
            public contact links without editing code.
          </p>
        </div>
      </div>
      <SiteCustomizationForm initial={initial} mediaAssets={mediaAssets} />
    </main>
  )
}
