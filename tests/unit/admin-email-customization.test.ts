import { afterEach, describe, expect, it, vi } from 'vitest'
import { can } from '@/lib/permissions/can'
import { adminPortalGroups, isPortalItemActive } from '@/lib/navigation/portal'
import { adminBroadcastSchema, parseCustomEmailList } from '@/lib/email/adminBroadcastInput'
import { renderAdminBroadcastEmail } from '@/lib/email/templates'
import { parseStudioCustomization, STUDIO_THEME_PRESETS } from '@/lib/cms/studioTheme'

afterEach(() => vi.restoreAllMocks())

describe('expanded admin capabilities & streamlined navigation', () => {
  it('grants SEND_EMAIL and CUSTOMIZE_SITE to both Admins and Super Admins, but not Editors', () => {
    for (const role of ['ADMIN', 'SUPER_ADMIN'] as const) {
      expect(can(role, 'SEND_EMAIL')).toBe(true)
      expect(can(role, 'CUSTOMIZE_SITE')).toBe(true)
    }
    expect(can('EDITOR', 'SEND_EMAIL')).toBe(false)
    expect(can('EDITOR', 'CUSTOMIZE_SITE')).toBe(false)
    expect(can('ADMIN', 'MANAGE_USERS')).toBe(false)
    expect(can('ADMIN', 'MANAGE_STAFF')).toBe(false)
  })

  it('merges projects + teams and requests queues in Admin navigation while exposing Email & Customize tools', () => {
    const adminItems = adminPortalGroups('ADMIN').flatMap(group => group.items)
    expect(adminItems.some(item => item.href === '/admin/email')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/customize')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/requests')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/navigation')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/redirects')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/projects')).toBe(true)
    expect(adminItems.some(item => item.href === '/admin/project-teams')).toBe(false)

    const editorItems = adminPortalGroups('EDITOR').flatMap(group => group.items)
    expect(editorItems.some(item => item.href === '/admin/email')).toBe(false)
    expect(editorItems.some(item => item.href === '/admin/customize')).toBe(false)
    expect(editorItems.some(item => item.href === '/admin/requests')).toBe(false)

    expect(isPortalItemActive('/admin/projects/abc-123', '/admin/projects')).toBe(true)
    expect(isPortalItemActive('/admin/project-teams/abc-123', '/admin/projects')).toBe(true)
    expect(isPortalItemActive('/admin/officer-applications', '/admin/requests')).toBe(true)
    expect(isPortalItemActive('/admin/project-proposals', '/admin/requests')).toBe(true)
  })
})

describe('admin email broadcast validation and HTML escaping', () => {
  it('parses, normalizes, and deduplicates comma/newline-separated email lists', () => {
    expect(parseCustomEmailList('Ada@Oberlin.edu, bob@oberlin.edu;\nADA@oberlin.edu')).toEqual([
      'ada@oberlin.edu',
      'bob@oberlin.edu',
    ])
    expect(() => parseCustomEmailList('good@oberlin.edu, not-an-email')).toThrow('INVALID_EMAIL:not-an-email')
  })

  it('accepts rich broadcast links and blocks javascript: URLs', () => {
    const parsed = adminBroadcastSchema.parse({
      audience: 'all_members',
      subject: 'Spring Build Night',
      body: 'Join us in Science Center.',
      imageUrl: 'https://www.makeoberlin.site/brand/workshop.webp',
      ctaLabel: 'RSVP now',
      ctaUrl: '/events',
      links: [{ label: 'Design folder', url: 'https://drive.google.com/drive/folders/123' }],
      alsoNotifyPortal: true,
    })
    expect(parsed.links).toHaveLength(1)

    expect(() =>
      adminBroadcastSchema.parse({
        audience: 'all_members',
        subject: 'Bad link test',
        body: 'Hello',
        ctaLabel: 'Click',
        ctaUrl: 'javascript:alert(1)',
      }),
    ).toThrow()
  })

  it('renders rich HTML & plain-text email while escaping user HTML and unsafe protocols', () => {
    const email = renderAdminBroadcastEmail({
      recipientName: 'Kwaku <script>',
      subject: 'Kickoff & CAD <b>Review</b>',
      eyebrow: 'Robotics Team',
      body: 'Bring your laptop.\n\nSee you at 6pm.',
      imageUrl: 'https://www.makeoberlin.site/hero.jpg',
      ctaLabel: 'Open workspace',
      ctaUrl: 'https://www.makeoberlin.site/member/teams/1',
      links: [
        { label: 'CAD files', url: 'https://onshape.com/doc/1' },
        { label: 'Bad script', url: 'javascript:alert(1)' },
      ],
    })

    expect(email.subject).toBe('Kickoff & CAD <b>Review</b>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).toContain('&lt;b&gt;Review&lt;/b&gt;')
    expect(email.html).toContain('https://www.makeoberlin.site/hero.jpg')
    expect(email.html).toContain('https://onshape.com/doc/1')
    expect(email.html).not.toContain('javascript:')
    expect(email.text).toContain('Open workspace: https://www.makeoberlin.site/member/teams/1')
    expect(email.text).toContain('- CAD files: https://onshape.com/doc/1')
    expect(email.text).not.toContain('javascript:')
  })
})

describe('site studio customization validation', () => {
  it('supports every studio theme preset and rejects unsafe redirect/social links', () => {
    for (const preset of STUDIO_THEME_PRESETS) {
      const parsed = parseStudioCustomization({
        themePreset: preset.id,
        heroHeadline: 'We Build at Oberlin',
        heroPrimaryCtaHref: '/get-involved',
        socialLinks: { github: 'https://github.com/oberlin-meo', instagram: '', linkedin: '' },
      })
      expect(parsed.themePreset).toBe(preset.id)
    }

    expect(() =>
      parseStudioCustomization({
        heroPrimaryCtaHref: 'javascript:alert(1)',
      }),
    ).toThrow()
  })
})
