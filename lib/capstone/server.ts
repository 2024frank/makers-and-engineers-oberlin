import 'server-only'
import { randomUUID } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CAPSTONE_LIMITS, RESUME_TYPES, type CapstoneApplication } from './types'

const BUCKET = 'capstone-resumes'
const SIGNED_URL_SECONDS = 60 * 10

/** Admins get every application; members get only their own. */
export async function listCapstoneApplications(): Promise<CapstoneApplication[]> {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.rpc('list_capstone_applications')
  if (error) throw new Error(error.message)
  return (data ?? []) as CapstoneApplication[]
}

/** A short-lived link to a resume. Storage policies limit this to the applicant and admins. */
export async function capstoneResumeUrl(path: string) {
  const s = await createSupabaseServerClient()
  const { data, error } = await s.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data) throw new Error('RESUME_NOT_FOUND')
  return data.signedUrl
}

export type CapstoneSubmission = { userId: string; area: string; interests: string; company: string; resume: File | null }

/** Uploads the resume (if a new one was chosen), then saves the application. */
export async function submitCapstoneApplication({ userId, area, interests, company, resume }: CapstoneSubmission) {
  const s = await createSupabaseServerClient()
  let path: string | null = null
  let name = ''
  if (resume && resume.size > 0) {
    const ext = RESUME_TYPES[resume.type]
    if (!ext) throw new Error('RESUME_TYPE')
    if (resume.size > CAPSTONE_LIMITS.resumeBytes) throw new Error('RESUME_TOO_LARGE')
    path = `${userId}/${randomUUID()}.${ext}`
    name = resume.name.slice(0, 200)
    const { error } = await s.storage.from(BUCKET).upload(path, resume, { contentType: resume.type, upsert: false })
    if (error) throw new Error('RESUME_UPLOAD_FAILED')
  }
  const { data, error } = await s.rpc('capstone_application_action', { p_action: 'apply', p_area: area, p_interests: interests, p_company: company, p_resume_path: path, p_resume_name: name })
  if (error) {
    if (path) await s.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }
  const previous = (data as { previousResume?: string | null } | null)?.previousResume
  if (previous) { const { error: cleanup } = await s.storage.from(BUCKET).remove([previous]); if (cleanup) console.error('old capstone resume cleanup failed', cleanup.message) }
}

export async function capstoneAction(action: 'withdraw' | 'review', userId?: string) {
  const s = await createSupabaseServerClient()
  const { error } = await s.rpc('capstone_application_action', { p_action: action, p_user_id: userId ?? null })
  if (error) throw new Error(error.message)
}

export function capstoneError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    ACTIVE_MEMBER_REQUIRED: 'Sign in with an active member account.',
    ADMIN_REQUIRED: 'Only admins can review capstone applications.',
    APPLICATION_INVALID: 'Check your answers, then try again.',
    RESUME_REQUIRED: 'Attach your resume.',
    RESUME_INVALID: 'Your resume could not be attached. Please upload it again.',
    RESUME_TYPE: 'Upload your resume as a PDF or Word (.docx) file.',
    RESUME_TOO_LARGE: 'Your resume must be 4 MB or smaller.',
    RESUME_UPLOAD_FAILED: 'Your resume could not be uploaded. Please try again.',
    APPLICATION_NOT_WITHDRAWABLE: 'This application can no longer be withdrawn.',
    APPLICATION_NOT_REVIEWABLE: 'This application has already been reviewed or withdrawn.',
  }
  return Object.entries(messages).find(([key]) => code.includes(key))?.[1] ?? 'Your application could not be saved. Please try again.'
}
