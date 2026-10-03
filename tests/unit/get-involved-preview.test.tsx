import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GetInvolvedPage from '@/app/(public)/get-involved/page'

vi.mock('@/lib/page-builder/publicPages', () => ({
  getPublishedPageBySlug: async () => null,
  getCmsRenderContext: async () => ({}),
}))

beforeEach(() => {
  vi.stubEnv('OEC_PUBLIC_PREVIEW', '1')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
})
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

it('wires the offline public preview into the join form', async () => {
  render(await GetInvolvedPage({ searchParams: Promise.resolve({ type: 'join_project', project: 'Printer repair' }) }))
  expect(screen.getByText('Submissions unavailable in this preview')).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Project' })).toHaveValue('Printer repair')
})

it('keeps the real join form available when a backend is configured', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://configured.example')
  render(await GetInvolvedPage({ searchParams: Promise.resolve({}) }))
  expect(screen.queryByText('Submissions unavailable in this preview')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
})
