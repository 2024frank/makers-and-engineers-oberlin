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

export const adminBroadcastSchema = z
  .object({
    audience: z.enum(BROADCAST_AUDIENCES),
    projectId: z.string().uuid().optional().nullable(),
    clubTeamId: z.string().uuid().optional().nullable(),
    discipline: z.string().trim().max(80).optional().default(''),
    recipientUserIds: z.array(z.string().uuid()).max(500).optional().default([]),
    customEmails: z.string().trim().max(8000).optional().default(''),
    subject: z.string().trim().min(2, 'Enter a subject').max(180),
    body: z.string().trim().min(2, 'Write a message').max(12000),
    replyTo: z.union([z.literal(''), z.string().trim().email().max(320)]).optional().default(''),
    alsoNotifyPortal: z.boolean().optional().default(false),
    testOnly: z.boolean().optional().default(false),
  })
  // Club email is plain text. Design fields an older composer tab may still send (header
  // label, image, button, links) are dropped here rather than rejected.
  .strip()

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
