import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { capstoneResumeUrl, listCapstoneApplications } from '@/lib/capstone/server'

/** Redirects to a short-lived resume link. Members can open their own; admins can open any. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('user') ?? (await getCurrentMember())?.userId
    const application = userId ? (await listCapstoneApplications()).find(item => item.userId === userId) : undefined
    if (!application) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    return NextResponse.redirect(await capstoneResumeUrl(application.resumePath))
  } catch { return NextResponse.json({ error: 'Sign in to view this resume.' }, { status: 403 }) }
}
