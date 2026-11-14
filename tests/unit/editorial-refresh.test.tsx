import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { HeroSection } from '@/components/page-builder/sections/HeroSection'
import { heroSchema } from '@/lib/page-builder/schemas/hero'

afterEach(cleanup)
const section = heroSchema.parse({ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', headline: 'Build things. Learn together.', body: 'An officer-written introduction.' })

it('offers membership, project discovery, and events from the home opening without requiring a scheduled event', () => {
  render(<HeroSection section={section} context={{ pageSlug: 'home', events: [] }}/>)
  const opening = within(screen.getByRole('region', { name: 'Projects for Makers and Engineers' }))
  expect(opening.getByRole('link', { name: /Join the club/ })).toHaveAttribute('href', '/get-involved')
  expect(opening.getByRole('link', { name: /Explore projects/ })).toHaveAttribute('href', '/projects')
  expect(opening.getByRole('link', { name: /See club events/ })).toHaveAttribute('href', '/events')
  expect(opening.getByText('An officer-written introduction.')).toBeVisible()
})

it('keeps the selected CMS photograph and accessible description', () => {
  render(<HeroSection section={{ ...section, imageId: 'club-photo', imageAlt: 'A member repairing a printer' }} context={{ pageSlug: 'home', media: { 'club-photo': { url: '/test-club-photo.jpg', alt: 'Original caption' } } }}/>)
  expect(screen.getByRole('img', { name: 'A member repairing a printer' })).toHaveAttribute('src', expect.stringContaining('url=%2Ftest-club-photo.jpg'))
})

it('preserves custom officer home headlines rather than overwriting every published title', () => {
  render(<HeroSection section={{ ...section, headline: 'Our autumn workshop is open' }} context={{ pageSlug: 'home' }}/>)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Our autumn workshop is open')
})

it('replaces the retired Supabase stock workbench photo and its stale caption with the 4K workshop photo', () => {
  render(
    <HeroSection
      section={{
        ...section,
        imageId: 'stock-workbench',
        imageAlt: 'Two students in safety glasses leaning over a workbench covered with circuit boards, wiring and a multimeter',
      }}
      context={{
        pageSlug: 'home',
        media: {
          'stock-workbench': {
            url: 'https://qaudokydctziaoakvkyv.supabase.co/storage/v1/object/public/oec-media/site/home-hero-workbench.jpg',
            alt: 'Two students in safety glasses',
          },
        },
      }}
    />
  )
  const heroImg = screen.getByRole('img', {
    name: 'Oberlin students and mentor discussing hardware builds in the makerspace studio',
  })
  expect(heroImg).toHaveAttribute('src', expect.stringContaining('oberlin-workshop-4k.webp'))
})
