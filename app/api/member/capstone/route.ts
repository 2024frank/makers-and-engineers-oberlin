import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { capstoneAction, capstoneError, submitCapstoneApplication } from '@/lib/capstone/server'
import { CAPSTONE_LIMITS } from '@/lib/capstone/types'

const text = (form: FormData, key: string) => { const value = form.get(key); return typeof value === 'string' ? value.trim() : '' }

export async function POST(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Sign in with an active member account.' }, { status: 401 })
  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Check your answers, then try again.' }, { status: 400 })
  try {
    if (text(form, 'action') === 'withdraw') { await capstoneAction('withdraw'); return NextResponse.json({ ok: true }) }
    const area = text(form, 'area'), interests = text(form, 'interests'), company = text(form, 'company')
    const resume = form.get('resume')
    if (area.length < CAPSTONE_LIMITS.area[0] || area.length > CAPSTONE_LIMITS.area[1]) return NextResponse.json({ error: 'Tell us your area of interest.' }, { status: 400 })
    if (interests.length < CAPSTONE_LIMITS.interests[0] || interests.length > CAPSTONE_LIMITS.interests[1]) return NextResponse.json({ error: 'Describe what you want to work on in 20 to 3,000 characters.' }, { status: 400 })
    if (company.length > CAPSTONE_LIMITS.company) return NextResponse.json({ error: 'Keep the company name under 200 characters.' }, { status: 400 })
    await submitCapstoneApplication({ userId: member.userId, area, interests, company, resume: resume instanceof File ? resume : null })
    return NextResponse.json({ ok: true })
  } catch (error) { return NextResponse.json({ error: capstoneError(error) }, { status: 400 }) }
}
