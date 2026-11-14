import { z } from 'zod'

export const BROADCAST_AUDIENCES = [
  'all_members',
  'project_leads',
  'project_team',
  'club_team',
  'discipline',
  'officers',
  'pending_applicants',
  'individuals',
  'custom',
] as const

export type BroadcastAudienceMode = (typeof BROADCAST_AUDIENCES)[number]

const optionalUrl = z
  .string()
  .trim()
  .max(500)
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
    'Links must begin with / or https://',
  )

export const adminBroadcastSchema = z
  .object({
    audience: z.enum(BROADCAST_AUDIENCES),
    projectId: z.string().uuid().optional().nullable(),
    clubTeamId: z.string().uuid().optional().nullable(),
    discipline: z.string().trim().max(80).optional().default(''),
    recipientUserIds: z.array(z.string().uuid()).max(500).optional().default([]),
    customEmails: z.string().trim().max(8000).optional().default(''),
    subject: z.string().trim().min(2, 'Enter a subject').max(180),
    eyebrow: z.string().trim().max(80).optional().default(''),
    body: z.string().trim().min(2, 'Write a message').max(12000),
    imageUrl: optionalUrl.optional().default(''),
    imageAlt: z.string().trim().max(180).optional().default(''),
    ctaLabel: z.string().trim().max(60).optional().default(''),
    ctaUrl: optionalUrl.optional().default(''),
    links: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          url: optionalUrl.refine(val => Boolean(val), 'Enter a valid URL'),
        }),
      )
      .max(12)
      .optional()
      .default([]),
    replyTo: z.union([z.literal(''), z.string().trim().email().max(320)]).optional().default(''),
    alsoNotifyPortal: z.boolean().optional().default(false),
    testOnly: z.boolean().optional().default(false),
  })
  .strict()

export type AdminBroadcastInput = z.infer<typeof adminBroadcastSchema>

export type EmailRecipientChoice = {
  id: string
  email: string
  name: string
  kind: 'member' | 'officer' | 'applicant'
  disciplines: string[]
}

export type EmailGroupChoice = {
  projects: Array<{ id: string; title: string; memberCount: number }>
  clubTeams: Array<{ id: string; name: string; memberCount: number }>
  disciplines: Array<{ name: string; count: number }>
  counts: {
    allMembers: number
    projectLeads: number
    officers: number
    pendingApplicants: number
  }
}

export type EmailBroadcastHistoryEntry = {
  id: string
  createdAt: string
  subject: string
  audienceLabel: string
  recipientCount: number
  sentCount: number
  notifiedCount: number
  ctaLabel?: string
  hasImage?: boolean
  linkCount?: number
  previewText?: string
  senderName?: string
}

export function parseCustomEmailList(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
  const valid: string[] = []
  const seen = new Set<string>()
  const emailSchema = z.string().email().max(320)
  for (const item of parts) {
    if (!emailSchema.safeParse(item).success) {
      throw new Error(`INVALID_EMAIL:${item}`)
    }
    if (!seen.has(item)) {
      seen.add(item)
      valid.push(item)
    }
  }
  return valid
}
