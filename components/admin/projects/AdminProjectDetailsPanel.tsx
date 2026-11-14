'use client'

import { useEffect, useState } from 'react'
import { Check, FileEdit, Globe, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { MediaAsset } from '@/lib/cms/media'
import { ProjectForm } from '@/components/admin/content/ProjectForm'
import { formatPortalDate } from '@/lib/format/portalDate'

export function AdminProjectDetailsPanel({
  projectId,
  initialPayload,
  hasDraft,
  updatedAt,
  mediaAssets,
  canPublish,
  defaultOpen = false,
}: {
  projectId: string
  initialPayload: Record<string, unknown>
  hasDraft: boolean
  updatedAt: string
  mediaAssets: MediaAsset[]
  canPublish: boolean
  defaultOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [payload, setPayload] = useState<Record<string, unknown>>(() => structuredClone(initialPayload))
  const [busy, setBusy] = useState<'idle' | 'saving' | 'publishing'>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === '#project-edit-details') setOpen(true)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  function updateField(name: string, value: unknown) {
    setPayload(current => ({ ...current, [name]: value }))
    setNotice('')
  }

  async function saveDraftOnly() {
    setBusy('saving')
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType: 'projects', entityId: projectId, payload }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Could not save project changes.')
      setNotice('Draft saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project changes.')
    } finally {
      setBusy('idle')
    }
  }

  async function saveAndPublish() {
    setBusy('publishing')
    setError('')
    setNotice('')
    try {
      const saveRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType: 'projects', entityId: projectId, payload }),
      })
      const saveData = await saveRes.json().catch(() => ({}))
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Could not save project draft before publishing.')

      const pubRes = await fetch('/api/publish/content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType: 'projects', entityId: projectId }),
      })
      const pubData = await pubRes.json().catch(() => ({}))
      if (!pubRes.ok) throw new Error(pubData.error ?? 'Check required fields (title, summary, track) before publishing.')
      setNotice('Project updated and published to the website.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish project.')
    } finally {
      setBusy('idle')
    }
  }

  return (
    <section id="project-edit-details" className="pt-card" aria-labelledby="pt-details-heading">
      <div className="pt-card-head">
        <div>
          <h2 id="pt-details-heading">
            <FileEdit size={17} /> Project details & website listing
          </h2>
          <p className="pt-hint" style={{ margin: '4px 0 0' }}>
            {hasDraft ? 'Unpublished draft changes saved' : 'Synced with website'} · Updated{' '}
            {formatPortalDate(updatedAt)}
          </p>
        </div>
        <button type="button" className="button button--ghost" onClick={() => setOpen(v => !v)}>
          {open ? 'Hide editor' : 'Edit title, description & media'}
        </button>
      </div>

      {open && (
        <div className="pt-stack" style={{ marginTop: 14 }}>
          <ProjectForm value={payload} onChange={updateField} mediaAssets={mediaAssets} />
          {error && (
            <p className="portal-form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="portal-save-feedback" role="status">
              <Check size={14} /> {notice}
            </p>
          )}
          <div className="pt-actions">
            <button
              type="button"
              className="button button--ghost"
              disabled={busy !== 'idle'}
              onClick={saveDraftOnly}
            >
              {busy === 'saving' ? (
                <>
                  <Loader2 size={15} /> Saving draft...
                </>
              ) : (
                'Save draft'
              )}
            </button>
            {canPublish && (
              <button
                type="button"
                className="button button--cardinal"
                disabled={busy !== 'idle'}
                onClick={saveAndPublish}
              >
                {busy === 'publishing' ? (
                  <>
                    <Loader2 size={15} /> Publishing...
                  </>
                ) : (
                  <>
                    <Globe size={15} /> Save & publish live
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
