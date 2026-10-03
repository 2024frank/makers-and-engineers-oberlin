import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PublicLayout from '@/app/(public)/layout'

vi.mock('@/lib/page-builder/publicPages', () => ({
  getPublishedNavigation: async () => [],
  getPublicSiteSettings: async () => ({ contact: { email: 'club@example.edu' }, footer: { text: 'Club' }, social: {}, brand: {}, announcement: null }),
}))
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

it('clearly identifies an offline public snapshot on every preview page', async () => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW', '1')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  render(await PublicLayout({ children: <h1>Projects</h1> }))
  const note = screen.getByRole('note', { name: 'About this preview' })
  expect(note).toHaveTextContent('Project snapshots from September 2026')
  expect(note).toHaveTextContent('Live club data and submissions are unavailable')
})

it('does not label the real configured site as a preview', async () => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW', '1')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://configured.supabase.co')
  render(await PublicLayout({ children: <h1>Projects</h1> }))
  expect(screen.queryByRole('note', { name: 'About this preview' })).not.toBeInTheDocument()
})
