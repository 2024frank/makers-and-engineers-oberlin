'use client'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ImagePlus, Save, Trash2, X } from 'lucide-react'
import type { ProjectWorkspace } from '@/lib/projects/workspace'
import type { WorkLog } from '@/lib/projects/workLogs'
import { relativeTime } from '@/lib/projects/labels'
import { workspaceErrorMessage } from '@/lib/projects/workspaceInput'
import { WorkspaceNotice } from './useWorkspaceAction'

const MAX_PHOTOS = 6
type Draft = { id: string; file: Blob; preview: string }

/** Shrink a phone photo in the browser so uploads stay small and quick on mobile data. */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    return blob ?? file
  } catch { return file }
}

export function MemberWorkspaces({ projectId, logs, roster, me, isLead, started }: { projectId: string; logs: WorkLog[]; roster: ProjectWorkspace['roster']; me: string; isLead: boolean; started: boolean }) {
  const router = useRouter()
  const people = useMemo(() => {
    const onTeam = roster.map(person => ({ userId: person.userId, name: person.userId === me ? 'My workspace' : person.displayName }))
    const known = new Set(onTeam.map(person => person.userId))
    const former = logs.filter(log => !known.has(log.authorUserId)).map(log => ({ userId: log.authorUserId, name: log.authorName }))
    const unique = [...new Map([...onTeam, ...former].map(person => [person.userId, person])).values()]
    return unique.sort((a, b) => Number(b.userId === me) - Number(a.userId === me))
  }, [roster, logs, me])
  const [selected, setSelected] = useState(people.some(person => person.userId === me) ? me : people[0]?.userId ?? me)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const draftsRef = useRef<Draft[]>([])
  useEffect(() => { draftsRef.current = drafts }, [drafts])
  useEffect(() => () => draftsRef.current.forEach(draft => URL.revokeObjectURL(draft.preview)), [])
  useEffect(() => { if (viewing) dialog.current?.showModal(); else dialog.current?.close() }, [viewing])

  const mine = selected === me
  const onRoster = roster.some(person => person.userId === me)
  const entries = logs.filter(log => log.authorUserId === selected)
  const selectedName = people.find(person => person.userId === selected)?.name ?? ''

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    const room = MAX_PHOTOS - drafts.length
    if (files.length > room) setError(workspaceErrorMessage('WORK_LOG_TOO_MANY_PHOTOS')); else setError('')
    const added = await Promise.all(files.slice(0, Math.max(room, 0)).map(async file => { const blob = await shrinkPhoto(file); return { id: crypto.randomUUID(), file: blob, preview: URL.createObjectURL(blob) } }))
    setDrafts(current => [...current, ...added].slice(0, MAX_PHOTOS))
  }
  function removeDraft(id: string) {
    setDrafts(current => { current.filter(draft => draft.id === id).forEach(draft => URL.revokeObjectURL(draft.preview)); return current.filter(draft => draft.id !== id) })
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const formElement = event.currentTarget
    const body = String(new FormData(formElement).get('body') ?? '')
    if (body.trim().length < 2 && !drafts.length) { setError(workspaceErrorMessage('WORK_LOG_REQUIRED')); return }
    const form = new FormData()
    form.set('body', body)
    drafts.forEach(draft => form.append('photos', draft.file, 'photo.jpg'))
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/member/projects/${projectId}/worklog`, { method: 'POST', body: form })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { setError(workspaceErrorMessage(response.status === 413 ? 'WORK_LOG_PHOTO_TOO_LARGE' : result.error ?? '')); return }
      drafts.forEach(draft => URL.revokeObjectURL(draft.preview))
      setDrafts([]); formElement.reset(); setMessage('Saved to your workspace.')
      router.refresh()
    } catch { setError('Could not reach the server. Nothing was saved; please try again.') }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (busy || !window.confirm('Delete this entry and its photos?')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/member/projects/${projectId}/worklog?id=${id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { setError(workspaceErrorMessage(result.error ?? '')); return }
      setMessage('Entry deleted.'); router.refresh()
    } catch { setError('Could not reach the server. Nothing changed; please try again.') }
    finally { setBusy(false) }
  }

  if (!started) return <section className="pt-card" id="workspaces" aria-labelledby="ws-workspaces">
    <h2 id="ws-workspaces">Workspaces</h2>
    <p className="pt-hint">Each teammate gets a workspace for progress notes and photos once a club officer starts this project.</p>
  </section>

  return <section className="pt-card" id="workspaces" aria-labelledby="ws-workspaces">
    <div className="pt-card-head"><h2 id="ws-workspaces">Workspaces</h2><span className="portal-muted">Only your team and club officers see this</span></div>
    <div className="pt-tabs" role="tablist" aria-label="Team workspaces">{people.map(person => <button key={person.userId} type="button" role="tab" aria-selected={person.userId === selected} onClick={() => setSelected(person.userId)}>{person.name}</button>)}</div>
    {mine && onRoster && <form className="pt-form" onSubmit={submit}>
      <label htmlFor="ws-log-body">Progress note</label>
      <textarea id="ws-log-body" name="body" rows={3} maxLength={4000} placeholder="What did you build, test or learn, and what is next?"/>
      {drafts.length > 0 && <ul className="pt-photos pt-photos--draft">{drafts.map((draft, index) => <li key={draft.id}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a photo that is not uploaded yet */}
        <img src={draft.preview} alt={`Photo ${index + 1} to upload`}/>
        <button type="button" className="pt-photo-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => removeDraft(draft.id)}><X size={14}/></button>
      </li>)}</ul>}
      <WorkspaceNotice error={error} message={message}/>
      <div className="pt-actions">
        <label className="pt-btn pt-file"><Camera size={16}/>Take photo<input type="file" accept="image/*" capture="environment" onChange={addPhotos} disabled={busy || drafts.length >= MAX_PHOTOS}/></label>
        <label className="pt-btn pt-file"><ImagePlus size={16}/>Add photos<input type="file" accept="image/*" multiple onChange={addPhotos} disabled={busy || drafts.length >= MAX_PHOTOS}/></label>
        <button className="button--cardinal" disabled={busy}><Save size={16}/>{busy ? 'Saving...' : 'Save entry'}</button>
      </div>
    </form>}
    {!mine && <WorkspaceNotice error={error} message={message}/>}
    {entries.length ? <ul className="pt-feed" style={{ marginTop: 10 }}>{entries.map(entry => <li className="pt-post" key={entry.id}>
      <header><strong>{entry.authorUserId === me ? 'You' : entry.authorName}</strong><time dateTime={entry.createdAt} suppressHydrationWarning>{relativeTime(entry.createdAt)}</time></header>
      {entry.body && <p>{entry.body}</p>}
      {entry.photos.length > 0 && <ul className="pt-photos">{entry.photos.map((photo, index) => <li key={photo.path}>
        <button type="button" onClick={() => setViewing(photo.url)} aria-label={`Open photo ${index + 1} of ${entry.photos.length}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
          <img src={photo.url} alt={`Progress photo ${index + 1} from ${entry.authorName}`} loading="lazy"/>
        </button>
      </li>)}</ul>}
      {(entry.authorUserId === me || isLead) && <footer><button type="button" className="pt-btn pt-btn--small" disabled={busy} onClick={() => void remove(entry.id)}><Trash2 size={14}/>Delete</button></footer>}
    </li>)}</ul> : <p className="pt-hint" style={{ marginTop: 12 }}>{mine ? 'Nothing here yet. Add a note or a photo each time you work on the project.' : `${selectedName} has not added anything yet.`}</p>}
    <dialog ref={dialog} className="pt-lightbox" aria-label="Photo" onClose={() => setViewing(null)} onClick={() => setViewing(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
      {viewing && <img src={viewing} alt="Progress photo, full size"/>}
      <button type="button" className="pt-btn pt-btn--small" onClick={() => setViewing(null)}><X size={14}/>Close</button>
    </dialog>
  </section>
}
