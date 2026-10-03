import { PageRenderer } from '@/components/page-builder/PageRenderer'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
import { withClubActivities } from '@/lib/content/clubActivities'
import type { PageSnapshot } from '@/lib/page-builder/types'
export async function CmsPage({page,mode='public'}:{page:PageSnapshot;mode?:'public'|'preview'}){
  const sections = withClubActivities(page.slug, page.sections)
  const hasVisibleHero=sections.some(section=>section.type==='hero'&&section.isVisible)
  return <>{!hasVisibleHero&&<h1 className="sr-only">{page.title}</h1>}<PageRenderer sections={sections} context={{...await getCmsRenderContext(),pageSlug:page.slug}} mode={mode}/></>
}
