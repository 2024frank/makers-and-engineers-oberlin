'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Send, Undo2 } from 'lucide-react'
import { LeadershipDate } from '@/components/leadership/shared'
import { CAPSTONE_LIMITS, capstoneStatusLabels, resumeType, type CapstoneApplication } from '@/lib/capstone/types'

async function post(body: FormData) {
  const response = await fetch('/api/member/capstone', { method: 'POST', body })
  const result = await response.json().catch(() => null)
  if (!response.ok || result?.ok !== true) throw new Error(typeof result?.error === 'string' ? result.error : 'Your application could not be saved. Please try again.')
}

function ApplicationForm({ application, onDone }: { application?: CapstoneApplication; onDone: () => void }) {
  const router = useRouter()
  const lock = useRef(false)
  const [area, setArea] = useState(application?.areaOfInterest ?? '')
  const [interests, setInterests] = useState(application?.interests ?? '')
  const [company, setCompany] = useState(application?.company ?? '')
  const [resume, setResume] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    if (area.trim().length < CAPSTONE_LIMITS.area[0]) { setError('Tell us your area of interest.'); return }
    if (interests.trim().length < CAPSTONE_LIMITS.interests[0]) { setError('Describe what you want to work on in at least 20 characters.'); return }
    if (!resume && !application) { setError('Attach your resume.'); return }
    if (resume && !resumeType(resume)) { setError('Upload your resume as a PDF or Word (.docx) file.'); return }
    if (resume && resume.size > CAPSTONE_LIMITS.resumeBytes) { setError('Your resume must be 4 MB or smaller.'); return }
    const body = new FormData()
    body.set('area', area.trim()); body.set('interests', interests.trim()); body.set('company', company.trim())
    if (resume) body.set('resume', resume)
    lock.current = true; setBusy(true); setError('')
    try { await post(body); router.refresh(); onDone() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your application could not be saved. Please try again.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <form className="leadership-form" onSubmit={submit} noValidate aria-label="Capstone application">
    <fieldset disabled={busy}>
      <label>Area of interest<input name="area" required maxLength={CAPSTONE_LIMITS.area[1]} placeholder="For example, mechanical design, software, robotics" value={area} onChange={event => setArea(event.target.value)}/></label>
      <label>What are you interested in working on?<textarea name="interests" rows={6} required maxLength={CAPSTONE_LIMITS.interests[1]} value={interests} onChange={event => setInterests(event.target.value)}/></label>
      <label>Is there a particular company you have in mind? (optional)<input name="company" maxLength={CAPSTONE_LIMITS.company} value={company} onChange={event => setCompany(event.target.value)}/></label>
      <label>Resume (PDF or Word, up to 4 MB){application ? ' Leave empty to keep the one you sent.' : ''}<input name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => setResume(event.target.files?.[0] ?? null)}/></label>
      {error && <p className="portal-form-error" role="alert">{error}</p>}
      <div className="leadership-actions"><button className="button button--primary" type="submit" disabled={busy}><Send size={17} aria-hidden="true"/>{busy ? 'Sending...' : application ? 'Save and resubmit' : 'Submit application'}</button></div>
    </fieldset>
  </form>
}

export function CapstoneApplicationPanel({ application }: { application?: CapstoneApplication }) {
  const router = useRouter()
  const [editing, setEditing] = useState(!application)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function withdraw() {
    const body = new FormData(); body.set('action', 'withdraw')
    setBusy(true); setError('')
    try { await post(body); setNotice('Application withdrawn.'); router.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your application could not be withdrawn.') }
    finally { setBusy(false) }
  }

  if (editing) return <>
    <ApplicationForm application={application} onDone={() => { setEditing(false); setNotice('Application sent. Officers will see it in the club admin.') }}/>
    {application && <div className="leadership-actions"><button type="button" className="button button--ghost" onClick={() => setEditing(false)}>Cancel</button></div>}
  </>
  if (!application) return notice ? <p className="leadership-notice" role="status">{notice}</p> : null
  return <article className="leadership-application" aria-label="Your capstone application">
    {notice && <p className="leadership-notice" role="status">{notice}</p>}
    <p className="leadership-meta">{capstoneStatusLabels[application.status]} <LeadershipDate value={application.submittedAt}/></p>
    <h4>Area of interest</h4><p className="leadership-copy">{application.areaOfInterest}</p>
    <h4>What you want to work on</h4><p className="leadership-copy">{application.interests}</p>
    {application.company && <><h4>Company in mind</h4><p className="leadership-copy">{application.company}</p></>}
    <h4>Resume</h4><p><a className="portal-text-link" href={`/api/capstone/resume?user=${application.userId}`} target="_blank" rel="noreferrer"><FileText size={16} aria-hidden="true"/>{application.resumeName || 'View resume'}</a></p>
    <div className="leadership-actions">
      <button type="button" className="button button--secondary" disabled={busy} onClick={() => { setNotice(''); setEditing(true) }}>{application.status === 'WITHDRAWN' ? 'Resubmit application' : 'Edit application'}</button>
      {application.status === 'PENDING' && <button type="button" className="button button--ghost" disabled={busy} onClick={withdraw}><Undo2 size={17} aria-hidden="true"/>{busy ? 'Withdrawing...' : 'Withdraw application'}</button>}
    </div>
    {error && <p className="portal-form-error" role="alert">{error}</p>}
  </article>
}
