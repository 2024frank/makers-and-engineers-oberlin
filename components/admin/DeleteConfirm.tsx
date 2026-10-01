'use client'
import '@/components/projects/project-teams.css'
import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'

type Props = {
  /** Button label, e.g. "Delete event". */
  label: string
  /** Name of the item, shown in bold so the officer knows exactly what goes. */
  itemName: string
  /** What is lost. Plain sentence(s), shown above the confirm button. */
  consequence: string
  /** When set, the officer must type the item name before the button enables. */
  requireTyped?: boolean
  /** Runs the delete. Return an error message to show, or null on success. */
  onConfirm: (typedName: string) => Promise<string | null>
  /** Verb on the final button. Defaults to "Delete permanently". */
  confirmLabel?: string
  compact?: boolean
}

// Shared confirm step for officer deletes: a named confirmation (optionally typed), a plain consequence line,
// and an inline error. Uses the same pt-* styles as the project delete form.
export function DeleteConfirm({ label, itemName, consequence, requireTyped = false, onConfirm, confirmLabel = 'Delete permanently', compact = false }: Props) {
  const [confirming, setConfirming] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const matches = !requireTyped || typed.trim().toLowerCase() === itemName.trim().toLowerCase()
  function reset() { setConfirming(false); setTyped(''); setError('') }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !matches) return
    setBusy(true); setError('')
    try {
      const failure = await onConfirm(typed)
      if (failure) setError(failure)
    } catch {
      setError('Could not confirm the result. Refresh the page before retrying; the item may already be deleted.')
    } finally { setBusy(false) }
  }
  if (!confirming) return <div className="pt-actions"><button type="button" className="pt-btn--danger" aria-label={`${label}: ${itemName}`} onClick={() => setConfirming(true)}><Trash2 size={16}/>{label}</button></div>
  return <form className="pt-form" onSubmit={submit} aria-label={label}>
    <p className="pt-hint"><strong>Delete {itemName}?</strong> {consequence} It cannot be undone.</p>
    {requireTyped && <label>Type <strong>{itemName}</strong> to confirm<input value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off"/></label>}
    {error && <p className="portal-form-error" role="alert">{error}</p>}
    <div className="pt-actions"><button className="pt-btn--danger" disabled={!matches || busy}><Trash2 size={16}/>{busy ? 'Deleting...' : confirmLabel}</button><button type="button" disabled={busy} onClick={reset}>{compact ? 'Keep' : 'Cancel'}</button></div>
  </form>
}
