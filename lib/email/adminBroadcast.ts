import 'server-only'
import { listMedia } from '@/lib/cms/media'
import { sendTransactionalEmail, sendTransactionalEmailBatch } from '@/lib/email/client'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'
import { renderAdminBroadcastEmail } from '@/lib/email/templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminBroadcastSchema,
  parseCustomEmailList,
  type AdminBroadcastInput,
  type EmailBroadcastHistoryEntry,
  type EmailGroupChoice,
  type EmailRecipientChoice,
} from './adminBroadcastInput'

type ResolvedRecipient = {
  email: string
  name: string
  userId: string | null
}

function resolveBroadcastUrl(raw: string | undefined | null, origin?: string): string | undefined {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${memberSiteOrigin(origin)}${trimmed}`
  }
  try {
    const parsed = new URL(trimmed)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

// SCHEMA MISMATCH. The queries marked below name a table or a column that no migration in
// database/migrations creates: the `admin_users` relation, `membership_requests.oberlin_email`
// (that column is `email`) and `club_team_memberships.status`. On a database built from the
// migrations each of them fails, and this file reads a failed query as an empty list. They
// are kept exactly as written, because the fix decides who receives email. Until then they go
// through an untyped view of the client, so that the rest of the file is still checked.
type UncheckedClient = SupabaseClient

/** Load members, groups, media assets, and recent broadcast history for the Admin Email composer. */
export async function getAdminEmailConsoleData() {
  const admin = createSupabaseAdminClient()
  const [
    membersRes,
    officersRes,
    pendingRes,
    projectsRes,
    projectMembersRes,
    clubTeamsRes,
    clubTeamMembersRes,
    historyRes,
    mediaAssets,
  ] = await Promise.all([
    admin
      .from('member_profiles')
      .select('user_id,display_name,oberlin_email,disciplines')
      .eq('status', 'ACTIVE')
      .order('display_name')
      .limit(1000),
    // SCHEMA MISMATCH: no migration creates `admin_users`.
    (admin as UncheckedClient)
      .from('admin_users')
      .select('user_id,display_name,email,role')
      .eq('active', true)
      .order('display_name')
      .limit(100),
    // SCHEMA MISMATCH: membership_requests has `email`, not `oberlin_email`.
    admin
      .from('membership_requests')
      .select('id,display_name,oberlin_email,status')
      .in('status', ['REQUESTED', 'EMAIL_VERIFIED', 'PENDING_APPROVAL'])
      .order('created_at', { ascending: false })
      .limit(300),
    admin
      .from('projects')
      .select('id,title,publication_state')
      .neq('publication_state', 'archived')
      .order('title'),
    admin.from('project_memberships').select('project_id,user_id,role').eq('status', 'ACTIVE'),
    admin.from('club_teams').select('id,name').order('name'),
    // SCHEMA MISMATCH: club_team_memberships has no `status` column.
    (admin as UncheckedClient).from('club_team_memberships').select('team_id,user_id').eq('status', 'ACTIVE'),
    admin
      .from('audit_log')
      .select('id,created_at,after_snapshot')
      .eq('action', 'ADMIN_EMAIL_BROADCAST')
      .order('created_at', { ascending: false })
      .limit(20),
    listMedia('').catch(() => []),
  ])

  const members = membersRes.data ?? []
  const officers = officersRes.data ?? []
  const pending = pendingRes.data ?? []

  const leadIds = new Set(
    (projectMembersRes.data ?? [])
      .filter(row => row.role === 'LEAD')
      .map(row => row.user_id),
  )

  const projectMemberCounts = new Map<string, number>()
  for (const row of projectMembersRes.data ?? []) {
    projectMemberCounts.set(row.project_id, (projectMemberCounts.get(row.project_id) ?? 0) + 1)
  }

  const clubTeamCounts = new Map<string, number>()
  for (const row of clubTeamMembersRes.data ?? []) {
    clubTeamCounts.set(row.team_id, (clubTeamCounts.get(row.team_id) ?? 0) + 1)
  }

  const disciplineCounts = new Map<string, number>()
  for (const member of members) {
    for (const discipline of member.disciplines ?? []) {
      const clean = String(discipline).trim()
      if (clean) disciplineCounts.set(clean, (disciplineCounts.get(clean) ?? 0) + 1)
    }
  }

  const recipients: EmailRecipientChoice[] = [
    ...members.map(row => ({
      id: row.user_id,
      email: row.oberlin_email,
      name: row.display_name || row.oberlin_email,
      kind: 'member' as const,
      disciplines: (row.disciplines ?? []) as string[],
    })),
    ...officers
      .filter(officer => !members.some(m => m.user_id === officer.user_id))
      .map(row => ({
        id: row.user_id,
        email: row.email,
        name: `${row.display_name || row.email} (Officer)`,
        kind: 'officer' as const,
        disciplines: [],
      })),
  ]

  const groups: EmailGroupChoice = {
    projects: (projectsRes.data ?? []).map(project => ({
      id: project.id,
      title: project.title,
      memberCount: projectMemberCounts.get(project.id) ?? 0,
    })),
    clubTeams: (clubTeamsRes.data ?? []).map(team => ({
      id: team.id,
      name: team.name,
      memberCount: clubTeamCounts.get(team.id) ?? 0,
    })),
    disciplines: Array.from(disciplineCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    counts: {
      allMembers: members.length,
      projectLeads: leadIds.size,
      officers: officers.length,
      pendingApplicants: pending.length,
    },
  }

  const history: EmailBroadcastHistoryEntry[] = (historyRes.data ?? []).map(row => {
    const snap = (row.after_snapshot ?? {}) as Record<string, unknown>
    return {
      id: row.id,
      createdAt: row.created_at,
      subject: String(snap.subject ?? 'Club message'),
      audienceLabel: String(snap.audienceLabel ?? 'Selected recipients'),
      recipientCount: Number(snap.recipientCount ?? 0),
      sentCount: Number(snap.sentCount ?? 0),
      notifiedCount: Number(snap.notifiedCount ?? 0),
      ctaLabel: typeof snap.ctaLabel === 'string' ? snap.ctaLabel : undefined,
      hasImage: Boolean(snap.hasImage),
      linkCount: Number(snap.linkCount ?? 0),
      previewText: typeof snap.previewText === 'string' ? snap.previewText : undefined,
      senderName: typeof snap.senderName === 'string' ? snap.senderName : undefined,
    }
  })

  return {
    recipients,
    groups,
    history,
    imageAssets: mediaAssets.filter(asset => asset.mimeType.startsWith('image/')),
  }
}

async function resolveRecipients(
  input: AdminBroadcastInput,
  sender: { userId: string; email: string; displayName: string },
): Promise<{ audienceLabel: string; recipients: ResolvedRecipient[] }> {
  if (input.testOnly) {
    return {
      audienceLabel: `Test email to ${sender.email}`,
      recipients: [{ email: sender.email.toLowerCase(), name: sender.displayName || 'Officer', userId: sender.userId }],
    }
  }

  const admin = createSupabaseAdminClient()
  const deduped = new Map<string, ResolvedRecipient>()
  const push = (email: string | null | undefined, name: string | null | undefined, userId: string | null) => {
    const clean = email?.trim().toLowerCase()
    if (!clean || deduped.has(clean)) return
    deduped.set(clean, { email: clean, name: name?.trim() || 'there', userId })
  }

  let audienceLabel = 'Club members'

  switch (input.audience) {
    case 'all_members': {
      audienceLabel = 'Everyone (all active members)'
      const { data, error } = await admin
        .from('member_profiles')
        .select('user_id,display_name,oberlin_email')
        .eq('status', 'ACTIVE')
        .limit(1000)
      if (error) throw new Error(`AUDIENCE_LOAD_FAILED:${error.message}`)
      for (const row of data ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      break
    }

    case 'project_leads': {
      audienceLabel = 'All project leads'
      const { data: leads } = await admin
        .from('project_memberships')
        .select('user_id')
        .eq('status', 'ACTIVE')
        .eq('role', 'LEAD')
      const ids = Array.from(new Set((leads ?? []).map(item => item.user_id)))
      if (ids.length) {
        const { data: profiles } = await admin
          .from('member_profiles')
          .select('user_id,display_name,oberlin_email')
          .in('user_id', ids)
          .eq('status', 'ACTIVE')
        for (const row of profiles ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      }
      break
    }

    case 'project_team': {
      if (!input.projectId) throw new Error('PROJECT_SELECTION_REQUIRED')
      const [{ data: project }, { data: roster }] = await Promise.all([
        admin.from('projects').select('title').eq('id', input.projectId).maybeSingle(),
        admin
          .from('project_memberships')
          .select('user_id')
          .eq('project_id', input.projectId)
          .eq('status', 'ACTIVE'),
      ])
      audienceLabel = `Project team: ${project?.title ?? 'Selected project'}`
      const ids = Array.from(new Set((roster ?? []).map(row => row.user_id)))
      if (ids.length) {
        const { data: profiles } = await admin
          .from('member_profiles')
          .select('user_id,display_name,oberlin_email')
          .in('user_id', ids)
          .eq('status', 'ACTIVE')
        for (const row of profiles ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      }
      break
    }

    case 'club_team': {
      if (!input.clubTeamId) throw new Error('TEAM_SELECTION_REQUIRED')
      const [{ data: team }, { data: roster }] = await Promise.all([
        admin.from('club_teams').select('name').eq('id', input.clubTeamId).maybeSingle(),
        // SCHEMA MISMATCH: club_team_memberships has no `status` column.
        (admin as UncheckedClient)
          .from('club_team_memberships')
          .select('user_id')
          .eq('team_id', input.clubTeamId)
          .eq('status', 'ACTIVE'),
      ])
      audienceLabel = `Club team: ${team?.name ?? 'Selected team'}`
      const ids = Array.from(new Set((roster ?? []).map(row => row.user_id)))
      if (ids.length) {
        const { data: profiles } = await admin
          .from('member_profiles')
          .select('user_id,display_name,oberlin_email')
          .in('user_id', ids)
          .eq('status', 'ACTIVE')
        for (const row of profiles ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      }
      break
    }

    case 'discipline': {
      if (!input.discipline) throw new Error('DISCIPLINE_REQUIRED')
      audienceLabel = `Track: ${input.discipline}`
      const { data: profiles } = await admin
        .from('member_profiles')
        .select('user_id,display_name,oberlin_email,disciplines')
        .eq('status', 'ACTIVE')
        .contains('disciplines', [input.discipline])
      for (const row of profiles ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      break
    }

    case 'officers': {
      audienceLabel = 'Club officers & staff'
      // SCHEMA MISMATCH: no migration creates `admin_users`.
      const { data } = await (admin as UncheckedClient)
        .from('admin_users')
        .select('user_id,display_name,email')
        .eq('active', true)
      for (const row of data ?? []) push(row.email, row.display_name, row.user_id)
      break
    }

    case 'pending_applicants': {
      audienceLabel = 'Pending membership requests'
      // SCHEMA MISMATCH: membership_requests has `email`, not `oberlin_email`.
      const { data } = await (admin as UncheckedClient)
        .from('membership_requests')
        .select('display_name,oberlin_email')
        .in('status', ['REQUESTED', 'EMAIL_VERIFIED', 'PENDING_APPROVAL'])
        .limit(500)
      for (const row of data ?? []) push(row.oberlin_email, row.display_name, null)
      break
    }

    case 'individuals': {
      const ids = Array.from(new Set(input.recipientUserIds))
      if (!ids.length) throw new Error('SELECT_AT_LEAST_ONE_RECIPIENT')
      const [{ data: members }, { data: officers }] = await Promise.all([
        admin
          .from('member_profiles')
          .select('user_id,display_name,oberlin_email')
          .in('user_id', ids),
        // SCHEMA MISMATCH: no migration creates `admin_users`.
        (admin as UncheckedClient).from('admin_users').select('user_id,display_name,email').in('user_id', ids),
      ])
      for (const row of members ?? []) push(row.oberlin_email, row.display_name, row.user_id)
      for (const row of officers ?? []) push(row.email, row.display_name, row.user_id)
      audienceLabel =
        deduped.size === 1
          ? `Direct: ${Array.from(deduped.values())[0].name}`
          : `${deduped.size} selected recipients`
      break
    }

    case 'custom': {
      const emails = parseCustomEmailList(input.customEmails)
      if (!emails.length) throw new Error('ENTER_AT_LEAST_ONE_EMAIL')
      for (const email of emails) push(email, 'there', null)
      audienceLabel = emails.length === 1 ? `Direct: ${emails[0]}` : `${emails.length} custom addresses`
      break
    }
  }

  // Allow combining any group or selection with extra comma-separated addresses.
  if (input.audience !== 'custom' && input.customEmails.trim()) {
    for (const email of parseCustomEmailList(input.customEmails)) {
      push(email, 'there', null)
    }
  }

  if (deduped.size === 0) throw new Error('NO_RECIPIENTS_FOUND')
  return { audienceLabel, recipients: Array.from(deduped.values()) }
}

/** Validate, render, send, optionally notify in-portal, and audit an admin rich email broadcast. */
export async function sendAdminBroadcast(
  adminActor: { userId: string; email: string; displayName: string },
  rawInput: unknown,
  origin?: string,
) {
  const input = adminBroadcastSchema.parse(rawInput)
  const { audienceLabel, recipients } = await resolveRecipients(input, adminActor)

  const resolvedImageUrl = resolveBroadcastUrl(input.imageUrl, origin)
  const resolvedCtaUrl = resolveBroadcastUrl(input.ctaUrl, origin)
  const resolvedLinks = input.links
    .map(link => ({
      label: link.label.trim(),
      url: resolveBroadcastUrl(link.url, origin),
    }))
    .filter((item): item is { label: string; url: string } => Boolean(item.label && item.url))

  const buildMessageFor = (recipientName: string) =>
    renderAdminBroadcastEmail({
      recipientName,
      subject: input.subject,
      eyebrow: input.eyebrow || undefined,
      body: input.body,
      imageUrl: resolvedImageUrl,
      imageAlt: input.imageAlt,
      ctaLabel: input.ctaLabel,
      ctaUrl: resolvedCtaUrl,
      links: resolvedLinks,
      replyTo: input.replyTo || undefined,
    })

  let sentCount = 0
  if (recipients.length === 1) {
    const ok = await sendTransactionalEmail({
      to: recipients[0].email,
      message: buildMessageFor(recipients[0].name),
      required: true,
    })
    sentCount = ok ? 1 : 0
  } else {
    sentCount = await sendTransactionalEmailBatch({
      messages: recipients.map(recipient => ({
        to: recipient.email,
        message: buildMessageFor(recipient.name),
      })),
      required: true,
    })
  }

  let notifiedCount = 0
  const admin = createSupabaseAdminClient()
  if (!input.testOnly && input.alsoNotifyPortal) {
    const memberUserIds = Array.from(
      new Set(recipients.map(r => r.userId).filter((id): id is string => Boolean(id))),
    )
    if (memberUserIds.length) {
      const actionUrl = input.ctaUrl?.trim().startsWith('/')
        ? input.ctaUrl.trim()
        : '/member/notifications'
      const summaryBody = input.body.trim().slice(0, 260)
      const { error: notifyError } = await admin.from('member_notifications').insert(
        memberUserIds.map(userId => ({
          user_id: userId,
          kind: 'CLUB_ANNOUNCEMENT',
          title: input.subject.trim().slice(0, 140),
          body: summaryBody,
          action_url: actionUrl,
        })),
      )
      if (!notifyError) notifiedCount = memberUserIds.length
    }
  }

  if (!input.testOnly) {
    await admin.from('audit_log').insert({
      actor_id: adminActor.userId,
      action: 'ADMIN_EMAIL_BROADCAST',
      entity_type: 'email_broadcast',
      entity_id: crypto.randomUUID(),
      after_snapshot: {
        subject: input.subject,
        audienceLabel,
        recipientCount: recipients.length,
        sentCount,
        notifiedCount,
        ctaLabel: input.ctaLabel || undefined,
        hasImage: Boolean(resolvedImageUrl),
        linkCount: resolvedLinks.length,
        previewText: input.body.trim().slice(0, 180),
        senderName: adminActor.displayName,
      },
    })
  }

  return {
    ok: true,
    testOnly: input.testOnly,
    audienceLabel,
    recipientCount: recipients.length,
    sentCount,
    notifiedCount,
  }
}
