import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { directoryVisibleFields } from './directory'

export type MemberProfileSettings = {
  userId: string
  email: string
  displayName: string
  classYear: number | null
  major: string
  disciplines: string[]
  skills: string[]
  projectInterests: string[]
  availability: string
  portfolioUrl: string
  githubUrl: string
  linkedinUrl: string
  directoryVisible: boolean
  visibleFields: string[]
  shareContact: boolean
  /** Whether the member gets club announcement email. Null when the setting could not be read. */
  announcementEmails: boolean | null
}

const compactList = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean))).slice(0, 30)
const cleanText = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max)
const cleanUrl = (value: unknown) => {
  const text = cleanText(value, 500)
  if (!text) return ''
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    return url.toString()
  } catch { throw new Error('PROFILE_URL_INVALID') }
}

export async function getMemberProfileSettings(userId: string): Promise<MemberProfileSettings> {
  const supabase = await createSupabaseServerClient()
  const [{ data: profile, error: profileError }, { data: privacy, error: privacyError }, { data: email, error: emailError }] = await Promise.all([
    supabase.from('member_profiles').select('user_id,oberlin_email,display_name,class_year,major,disciplines,skills,project_interests,availability,portfolio_url,github_url,linkedin_url').eq('user_id', userId).single(),
    supabase.from('member_privacy_settings').select('directory_visible,visible_fields,share_contact').eq('user_id', userId).single(),
    // Read on its own so the profile still loads if this setting cannot be read. The form
    // then leaves the setting out instead of showing a guess that a save would write back.
    supabase.from('member_profiles').select('announcement_email_opt_out').eq('user_id', userId).maybeSingle(),
  ])
  if (profileError || !profile) throw new Error('MEMBER_PROFILE_NOT_FOUND')
  if (privacyError || !privacy) throw new Error('MEMBER_PRIVACY_NOT_FOUND')
  return {
    userId: profile.user_id,
    email: profile.oberlin_email,
    displayName: profile.display_name,
    classYear: profile.class_year,
    major: profile.major ?? '',
    disciplines: profile.disciplines ?? [],
    skills: profile.skills ?? [],
    projectInterests: profile.project_interests ?? [],
    availability: profile.availability ?? '',
    portfolioUrl: profile.portfolio_url ?? '',
    githubUrl: profile.github_url ?? '',
    linkedinUrl: profile.linkedin_url ?? '',
    directoryVisible: Boolean(privacy.directory_visible),
    visibleFields: privacy.visible_fields ?? [],
    shareContact: Boolean(privacy.share_contact),
    announcementEmails: emailError || !email ? null : email.announcement_email_opt_out !== true,
  }
}

export async function updateMemberProfile(input: Record<string, unknown>, userId: string) {
  const displayName = cleanText(input.displayName, 100)
  if (displayName.length < 2) throw new Error('DISPLAY_NAME_REQUIRED')
  const rawYear = input.classYear === '' || input.classYear == null ? null : Number(input.classYear)
  const classYear = rawYear == null ? null : Math.trunc(rawYear)
  if (classYear !== null && (classYear < 2020 || classYear > 2100)) throw new Error('CLASS_YEAR_INVALID')
  const visibleFields = compactList(input.visibleFields).filter((field) => directoryVisibleFields.includes(field))
  const supabase = await createSupabaseServerClient()
  const { error: profileError } = await supabase.rpc('update_my_member_profile', {
    p_display_name: displayName,
    p_class_year: classYear,
    p_major: cleanText(input.major, 120),
    p_disciplines: compactList(input.disciplines),
    p_skills: compactList(input.skills),
    p_project_interests: compactList(input.projectInterests),
    p_availability: cleanText(input.availability, 240),
    p_portfolio_url: cleanUrl(input.portfolioUrl),
    p_github_url: cleanUrl(input.githubUrl),
    p_linkedin_url: cleanUrl(input.linkedinUrl),
  })
  if (profileError) throw new Error(`MEMBER_PROFILE_UPDATE_FAILED:${profileError.message}`)
  const { error: privacyError } = await supabase.from('member_privacy_settings').update({
    directory_visible: Boolean(input.directoryVisible),
    visible_fields: visibleFields,
    share_contact: Boolean(input.shareContact),
  }).eq('user_id', userId)
  if (privacyError) throw new Error(`MEMBER_PRIVACY_UPDATE_FAILED:${privacyError.message}`)
  // The form sends this only when the member changed it. A profile that was opened
  // earlier, or the phone app, must not undo an unsubscribe made from an email link.
  if (typeof input.announcementEmails === 'boolean') {
    const { error: emailError } = await supabase.rpc('set_my_announcement_email_opt_out', { p_opt_out: !input.announcementEmails })
    if (emailError) throw new Error(`MEMBER_EMAIL_PREFERENCE_UPDATE_FAILED:${emailError.message}`)
  }
}
