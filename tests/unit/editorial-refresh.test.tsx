import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { HeroSection } from '@/components/page-builder/sections/HeroSection'
import { heroSchema } from '@/lib/page-builder/schemas/hero'

afterEach(cleanup)
const section = heroSchema.parse({ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', headline: 'Build things. Learn together.', body: 'An officer-written introduction.' })

it('offers membership, project discovery, and events from the home opening without requiring a scheduled event', () => {
  render(<HeroSection section={section} context={{ pageSlug: 'home', events: [] }}/>)
  const opening = within(screen.getByRole('region', { name: 'Makers and Engineers at Oberlin' }))
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
