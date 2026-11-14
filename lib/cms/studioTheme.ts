import { z } from 'zod'

export const STUDIO_THEME_PRESETS = [
  { id: 'cardinal', label: 'Oberlin Cardinal', accent: '#a6192e', dark: '#851223', soft: '#fdf1f3' },
  { id: 'amber', label: 'Workshop Amber', accent: '#b45309', dark: '#92400e', soft: '#fef3c7' },
  { id: 'forest', label: 'Oberlin Pine', accent: '#166534', dark: '#14532d', soft: '#ecfdf5' },
  { id: 'cobalt', label: 'Lab Cobalt', accent: '#1d4ed8', dark: '#1e40af', soft: '#eff6ff' },
] as const

export type StudioThemePreset = (typeof STUDIO_THEME_PRESETS)[number]['id']

const safeInternalOrHttpHref = z
  .string()
  .trim()
  .max(400)
  .refine(
    value => {
      if (!value) return true
      if (value.startsWith('/') && !value.startsWith('//')) return true
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol)
      } catch {
        return false
      }
    },
    'Links must start with / or https://',
  )

const safeHttpUrl = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(300)
    .url()
    .refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use http:// or https://'),
])

const nullableUuid = z.union([z.string().uuid(), z.null()])

export const studioCustomizationSchema = z
  .object({
    themePreset: z.enum(['cardinal', 'amber', 'forest', 'cobalt']).default('cardinal'),
    heroEyebrow: z.string().trim().max(80).default(''),
    heroHeadline: z.string().trim().max(120).default(''),
    heroBody: z.string().trim().max(420).default(''),
    heroPrimaryCtaLabel: z.string().trim().max(48).default(''),
    heroPrimaryCtaHref: safeInternalOrHttpHref.default(''),
    heroSecondaryCtaLabel: z.string().trim().max(48).default(''),
    heroSecondaryCtaHref: safeInternalOrHttpHref.default(''),
    heroMediaId: nullableUuid.default(null),
    contactEmail: z.string().trim().email().max(320).default('makers.engineers@oberlin.edu'),
    footerText: z.string().trim().max(240).default('Student engineering projects at Oberlin College.'),
    announcementEnabled: z.boolean().default(false),
    announcementText: z.string().trim().max(240).default(''),
    announcementHref: safeInternalOrHttpHref.default(''),
    socialLinks: z
      .object({
        instagram: safeHttpUrl.default(''),
        linkedin: safeHttpUrl.default(''),
        github: safeHttpUrl.default(''),
      })
      .strict()
      .default({ instagram: '', linkedin: '', github: '' }),
  })
  .strict()

export type StudioCustomization = z.infer<typeof studioCustomizationSchema>

export const defaultStudioCustomization: StudioCustomization = studioCustomizationSchema.parse({})

export function parseStudioCustomization(input: unknown): StudioCustomization {
  return studioCustomizationSchema.parse(input)
}
