import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmailBatch } from '@/lib/email/client'
import { newEventEmail } from '@/lib/email/templates'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'

type Announcement =
  | { announced: false }
  | {
      announced: true
      eventId: string
      slug: string
      title: string
      summary: string
      startAt: string | null
      endAt: string | null
      location: string
      accessDetails: string
      recipients: { email: string; displayName: string }[]
    }

// Tells every active member about an upcoming event the first time it is published:
// a portal notice (added by the database function) and an email. Later republishes do nothing.
export async function announcePublishedEvent(eventId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('announce_published_event', { p_event_id: eventId })
  if (error) throw new Error(`EVENT_ANNOUNCEMENT_FAILED:${error.message}`)
  const result = data as Announcement
  if (!result.announced) return { announced: false, emailsSent: 0 }
  const actionUrl = `${memberSiteOrigin()}/events/${result.slug}`
  const emailsSent = await sendTransactionalEmailBatch({
    idempotencyKey: `event-announcement/${result.eventId}`,
    messages: result.recipients.filter(person => person.email).map(person => ({
      to: person.email,
      message: newEventEmail({
        memberName: person.displayName,
        eventTitle: result.title,
        startAt: result.startAt,
        endAt: result.endAt,
        location: result.location,
        summary: result.summary,
        accessDetails: result.accessDetails,
        actionUrl,
      }),
    })),
  })
  await admin.from('event_announcements').update({ emails_sent: emailsSent }).eq('event_id', result.eventId)
  return { announced: true, emailsSent }
}

export async function announcePublishedEventSafely(eventId: string) {
  try { await announcePublishedEvent(eventId) } catch { console.error('EVENT_ANNOUNCEMENT_FAILED') }
}
