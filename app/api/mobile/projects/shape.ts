import { createSupabaseServerClient } from '@/lib/supabase/server'

export type MobileProject = { id: string; slug: string; title: string; summary: string; status: string; difficulty: string; disciplines: string[]; skills: string[]; recruiting: boolean; problem: string; goal: string; image: { url: string; alt: string } | null }

type ProjectRow = { id: string; slug?: string | null; title?: string | null; summary?: string | null; status?: string | null; difficulty?: string | null; disciplines?: string[] | null; skills?: string[] | null; recruiting?: boolean | null; problem?: string | null; goal?: string | null; cover_media_id?: string | null }

async function coverImages(projects: ProjectRow[]) {
  const ids = Array.from(new Set(projects.map(project => project.cover_media_id).filter((id): id is string => typeof id === 'string' && id.length > 0)))
  const images = new Map<string, { url: string; alt: string }>()
  if (!ids.length) return images
  try {
    const s = await createSupabaseServerClient()
    const { data } = await s.from('media').select('id,public_url,alt_text').in('id', ids)
    for (const row of data ?? []) if (row.public_url) images.set(row.id, { url: row.public_url, alt: row.alt_text ?? '' })
  } catch {}
  return images
}

/** The fields the browse list and detail screens use, from the same published project rows as the web portal. */
export async function toMobileProjects(projects: ProjectRow[]): Promise<MobileProject[]> {
  const images = await coverImages(projects)
  return projects.map(project => ({
    id: String(project.id), slug: String(project.slug ?? ''), title: String(project.title ?? ''), summary: project.summary ?? '', status: String(project.status ?? 'proposed'), difficulty: project.difficulty ?? '',
    disciplines: project.disciplines ?? [], skills: project.skills ?? [], recruiting: Boolean(project.recruiting), problem: project.problem ?? '', goal: project.goal ?? '',
    image: images.get(String(project.cover_media_id)) ?? null,
  }))
}
