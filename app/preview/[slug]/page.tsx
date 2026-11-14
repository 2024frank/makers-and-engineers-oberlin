import { CmsPage } from '@/components/public/CmsPage'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { requireAdmin } from '@/lib/auth/requireRole'
import { getDraftPageBySlug } from '@/lib/page-builder/pageService'
import '@/app/(public)/professional.css'
import '@/app/(public)/project-led.css'

export const metadata = { robots: { index: false, follow: false }, title: 'Draft Preview' }

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin()
  const page = await getDraftPageBySlug((await params).slug)
  return (
    <div className="professional-site">
      <aside className="preview-bar">
        <BrandLogo variant="badge" />
        <div>
          <strong>Draft preview</strong>
          <span>This draft is only visible to signed-in officers.</span>
        </div>
        <a className="button button--ghost" href={`/admin/pages/${page.slug}`}>
          Back to editor
        </a>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <CmsPage page={page} mode="preview" />
      </main>
    </div>
  )
}
