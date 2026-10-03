import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CmsPage } from '@/components/public/CmsPage'
import { fallbackPages } from '@/lib/page-builder/publicPages'
import { pageSnapshotSchema } from '@/lib/page-builder/types'
vi.mock('@/lib/page-builder/publicPages', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/page-builder/publicPages')>(), getCmsRenderContext: async () => ({}) }))
afterEach(cleanup)
const headings = ['Workshops', 'Talks from 3-2 students and alumni', 'Capstone projects with CED', 'Group projects', 'Community building', 'Engineering pathways']

it.each(['home','about'])('centres all six charter activities on %s', async slug => {
  render(await CmsPage({ page: fallbackPages[slug] }))
  for (const name of headings) expect(screen.getByRole('heading', { level: 3, name })).toBeVisible()
  expect(screen.getByText(/We work with Career Exploration and Development \(CED\)/)).toBeVisible()
  expect(screen.getByText(/CAD and 3D printing, electronics and soldering, Arduino/)).toBeVisible()
  expect(screen.getByText(/Socials, study sessions, and informal build nights/)).toBeVisible()
})

it('puts the charter activities before project discovery on the homepage', async () => {
  render(await CmsPage({ page: fallbackPages.home }))
  const ordered = screen.getAllByRole('heading', { level: 2 }).map(x => x.textContent)
  expect(ordered.indexOf('What the club will do')).toBeGreaterThanOrEqual(0)
  expect(ordered.indexOf('What the club will do')).toBeLessThan(ordered.indexOf('Projects'))
  expect(screen.queryByRole('heading', { name: 'Areas of interest' })).not.toBeInTheDocument()
})

it('preserves custom CMS sections when adding the charter introduction', async () => {
  const page = pageSnapshotSchema.parse({ ...fallbackPages.home, sections: [{ stableKey: 'officer-note', type: 'rich_text', isVisible: true, heading: 'A note from our officers', body: 'Bring your own ideas.' }] })
  render(await CmsPage({ page }))
  expect(screen.getByRole('heading', { name: 'A note from our officers' })).toBeVisible()
  expect(screen.getByText('Bring your own ideas.')).toBeVisible()
  for (const name of headings) expect(screen.getByRole('heading', { name })).toBeVisible()
})

it('makes pathway support open to everyone without promising admission or placements', async () => {
  render(await CmsPage({ page: fallbackPages.pathway }))
  expect(screen.getByText(/Participation in a 3-2 program is not required/)).toBeVisible()
  expect(screen.getByText(/official advising/)).toBeVisible()
  expect(screen.getByText(/Talks from current 3-2 students and alumni/)).toBeVisible()
})

it('retains an officer-customized section even when it uses a legacy stable key', async () => {
  const page = pageSnapshotSchema.parse({ ...fallbackPages.home, sections: [{ stableKey: 'disciplines', type: 'discipline_grid', isVisible: true, heading: 'Our current interests', items: [{ name: 'Assistive design', description: 'Build accessible tools.' }] }] })
  render(await CmsPage({ page }))
  expect(screen.getByRole('heading', { name: 'Assistive design' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'What the club will do' })).toBeVisible()
})

it('preserves edited descriptions under unchanged starter discipline titles', async () => {
  const original = fallbackPages.home.sections.find(section => section.type === 'discipline_grid')!
  if (original.type !== 'discipline_grid') throw new Error('Missing discipline fixture')
  const edited = { ...original, items: original.items.map((item, index) => index === 0 ? { ...item, description: 'Our custom fabrication workshop plan.' } : item) }
  render(await CmsPage({ page: { ...fallbackPages.home, sections: [edited] } }))
  expect(screen.getByText('Our custom fabrication workshop plan.')).toBeVisible()
})

it('preserves an edited principles intro under unchanged starter titles', async () => {
  const original = fallbackPages.about.sections.find(section => section.stableKey === 'principles')!
  if (original.type !== 'features_grid') throw new Error('Missing principles fixture')
  render(await CmsPage({ page: { ...fallbackPages.about, sections: [{ ...original, body: 'An officer-written way of working.' }] } }))
  expect(screen.getByText('An officer-written way of working.')).toBeVisible()
})

it('does not mutate the CMS source or duplicate the charter on repeated preparation', async () => {
  const { withClubActivities } = await import('@/lib/content/clubActivities')
  const original = structuredClone(fallbackPages.home.sections)
  const once = withClubActivities('home', original)
  expect(original).toEqual(fallbackPages.home.sections)
  expect(withClubActivities('home', once)).toEqual(once)
})

it('decodes exactly one entity layer in homepage CMS text and keeps it plain text', async () => {
  const hero = fallbackPages.home.sections.find(section => section.type === 'hero')!
  if (hero.type !== 'hero') throw new Error('Missing hero fixture')
  const { container } = render(await CmsPage({ page: { ...fallbackPages.home, sections: [{ ...hero, body: 'Show &amp;lt;strong&amp;gt; as escaped text.' }] } }))
  expect(screen.getByText('Show &lt;strong&gt; as escaped text.')).toBeVisible()
  expect(container.querySelector('.club-opening__intro strong')).toBeNull()
})
