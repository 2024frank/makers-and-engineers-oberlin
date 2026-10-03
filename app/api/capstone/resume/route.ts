import { NextResponse } from 'next/server'
import { capstoneResumeUrl, listCapstoneApplications } from '@/lib/capstone/server'

/** Redirects to a short-lived resume link. Members can open their own; admins can open any. */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('user')
  try {
    const applications = await listCapstoneApplications()
    const application = userId ? applications.find(item => item.userId === userId) : applications[0]
    if (!application) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    return NextResponse.redirect(await capstoneResumeUrl(application.resumePath))
  } catch { return NextResponse.json({ error: 'Sign in to view this resume.' }, { status: 403 }) }
}
