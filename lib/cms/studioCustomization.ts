import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  defaultStudioCustomization,
  parseStudioCustomization,
  type StudioCustomization,
} from './studioTheme'

const STUDIO_KEYS = ['studio', 'contact', 'footer', 'social', 'announcement'] as const

/** Load combined studio customization + site settings from published site_settings rows. */
export async function getAdminStudioCustomization(): Promise<StudioCustomization> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s
    .from('site_settings')
    .select('key,value')
    .in('key', [...STUDIO_KEYS])
  if (error) throw new Error(`STUDIO_LOAD_FAILED:${error.message}`)

  const values = Object.fromEntries((data ?? []).map(row => [row.key, row.value])) as Record<
    string,
    Record<string, unknown>
  >
  const studio = values.studio ?? {}
  const announcement = values.announcement ?? {}
  const social = values.social ?? {}

  return parseStudioCustomization({
    ...defaultStudioCustomization,
    ...studio,
    contactEmail:
      typeof studio.contactEmail === 'string' && studio.contactEmail
        ? studio.contactEmail
        : typeof values.contact?.email === 'string'
          ? values.contact.email
          : defaultStudioCustomization.contactEmail,
    footerText:
      typeof studio.footerText === 'string' && studio.footerText
        ? studio.footerText
        : typeof values.footer?.text === 'string'
          ? values.footer.text
          : defaultStudioCustomization.footerText,
    announcementEnabled:
      typeof studio.announcementEnabled === 'boolean'
        ? studio.announcementEnabled
        : Boolean(announcement.enabled),
    announcementText:
      typeof studio.announcementText === 'string'
        ? studio.announcementText
        : typeof announcement.text === 'string'
          ? announcement.text
          : '',
    announcementHref:
      typeof studio.announcementHref === 'string'
        ? studio.announcementHref
        : typeof announcement.href === 'string'
          ? announcement.href
          : '',
    socialLinks: {
      instagram:
        typeof (studio.socialLinks as Record<string, unknown> | undefined)?.instagram === 'string'
          ? String((studio.socialLinks as Record<string, unknown>).instagram)
          : typeof social.instagram === 'string'
            ? social.instagram
            : '',
      linkedin:
        typeof (studio.socialLinks as Record<string, unknown> | undefined)?.linkedin === 'string'
          ? String((studio.socialLinks as Record<string, unknown>).linkedin)
          : typeof social.linkedin === 'string'
            ? social.linkedin
            : '',
      github:
        typeof (studio.socialLinks as Record<string, unknown> | undefined)?.github === 'string'
          ? String((studio.socialLinks as Record<string, unknown>).github)
          : typeof social.github === 'string'
            ? social.github
            : '',
    },
  })
}

/** Save structured theme, hero, announcement, and club contact customization for Admins and Super Admins. */
export async function saveStudioCustomization(input: unknown, actorId: string): Promise<StudioCustomization> {
  const settings = parseStudioCustomization(input)
  const admin = createSupabaseAdminClient()

  if (settings.heroMediaId) {
    const { data: asset } = await admin
      .from('media')
      .select('id,mime_type')
      .eq('id', settings.heroMediaId)
      .maybeSingle()
    if (!asset || !String(asset.mime_type).startsWith('image/')) {
      throw new Error('HERO_MEDIA_INVALID')
    }
  }

  const rows = [
    { key: 'studio', value: settings, publication_state: 'published', updated_by: actorId },
    {
      key: 'contact',
      value: { email: settings.contactEmail },
      publication_state: 'published',
      updated_by: actorId,
    },
    {
      key: 'footer',
      value: { text: settings.footerText },
      publication_state: 'published',
      updated_by: actorId,
    },
    {
      key: 'social',
      value: settings.socialLinks,
      publication_state: 'published',
      updated_by: actorId,
    },
    {
      key: 'announcement',
      value: {
        enabled: settings.announcementEnabled,
        text: settings.announcementText,
        href: settings.announcementHref,
      },
      publication_state: 'published',
      updated_by: actorId,
    },
  ]

  const { error } = await admin.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw new Error(`STUDIO_SAVE_FAILED:${error.message}`)

  await admin.from('audit_log').insert({
    actor_id: actorId,
    action: 'STUDIO_CUSTOMIZATION_UPDATED',
    entity_type: 'site_settings',
    entity_id: 'studio',
    after_snapshot: settings,
  })

  return settings
}
