'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Check, ExternalLink, Image as ImageIcon, Link2, Mail, Plus, Send, Sparkles, Trash2, Upload, Users } from 'lucide-react'
import type { MediaAsset } from '@/lib/cms/media'
import {
  parseCustomEmailList,
  type BroadcastAudienceMode,
  type EmailBroadcastHistoryEntry,
  type EmailGroupChoice,
  type EmailRecipientChoice,
} from '@/lib/email/adminBroadcastInput'
import { describeSendFailure } from '@/lib/email/sendFailure'
import { useToast } from '@/components/ui/Toast'
import { formatPortalDate } from '@/lib/format/portalDate'

type LinkRow = { label: string; url: string }

type Props = {
  senderEmail: string
  recipients: EmailRecipientChoice[]
  groups: EmailGroupChoice
  initialHistory: EmailBroadcastHistoryEntry[]
  initialMedia: MediaAsset[]
}

const AUDIENCE_TABS: Array<{ id: BroadcastAudienceMode; label: string; hint: string }> = [
  { id: 'all_members', label: 'Everyone', hint: 'All active club members' },
  { id: 'project_team', label: 'Project team', hint: 'Members of one project' },
  { id: 'club_team', label: 'Club team', hint: 'Members of one club team' },
  { id: 'project_leads', label: 'Project leads', hint: 'All active project leads' },
  { id: 'discipline', label: 'Track', hint: 'Filter by engineering track' },
  { id: 'officers', label: 'Officers', hint: 'Admins & editors' },
  { id: 'pending_applicants', label: 'Applicants', hint: 'Pending membership requests' },
  { id: 'individuals', label: 'Pick people', hint: 'Choose specific members' },
  { id: 'custom', label: 'Custom email', hint: 'Any external or @oberlin.edu address' },
]

export function AdminEmailComposer({
  senderEmail,
  recipients,
  groups,
  initialHistory,
  initialMedia,
}: Props) {
  const toast = useToast()
  const [audience, setAudience] = useState<BroadcastAudienceMode>('all_members')
  const [projectId, setProjectId] = useState(groups.projects[0]?.id ?? '')
  const [clubTeamId, setClubTeamId] = useState(groups.clubTeams[0]?.id ?? '')
  const [discipline, setDiscipline] = useState(groups.disciplines[0]?.name ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [customEmails, setCustomEmails] = useState('')

  const [subject, setSubject] = useState('')
  const [eyebrow, setEyebrow] = useState('Projects for Makers and Engineers @Oberlin')
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [links, setLinks] = useState<LinkRow[]>([])
  const [alsoNotifyPortal, setAlsoNotifyPortal] = useState(true)

  const [mediaAssets, setMediaAssets] = useState(initialMedia)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState<'send' | 'test' | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const filteredRecipients = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return q
      ? recipients.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(q))
      : recipients
  }, [recipients, memberSearch])

  const estimatedRecipients = useMemo(() => {
    let base = 0
    if (audience === 'all_members') base = groups.counts.allMembers
    else if (audience === 'project_leads') base = groups.counts.projectLeads
    else if (audience === 'officers') base = groups.counts.officers
    else if (audience === 'pending_applicants') base = groups.counts.pendingApplicants
    else if (audience === 'project_team') {
      base = groups.projects.find(p => p.id === projectId)?.memberCount ?? 0
    } else if (audience === 'club_team') {
      base = groups.clubTeams.find(t => t.id === clubTeamId)?.memberCount ?? 0
    } else if (audience === 'discipline') {
      base = groups.disciplines.find(d => d.name === discipline)?.count ?? 0
    } else if (audience === 'individuals') {
      base = selectedIds.length
    }
    if (customEmails.trim()) {
      try {
        base += parseCustomEmailList(customEmails).length
      } catch {
        // Count invalid syntax after submit.
      }
    }
    return base
  }, [audience, projectId, clubTeamId, discipline, selectedIds, customEmails, groups])

  function toggleRecipient(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setErrorMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('sourceType', 'original')
      const response = await fetch('/api/media', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.item?.publicUrl) {
        throw new Error(data.error ?? 'Could not upload image.')
      }
      setMediaAssets(prev => [data.item, ...prev])
      setImageUrl(data.item.publicUrl)
      if (!imageAlt.trim()) setImageAlt(file.name.replace(/\.[^.]+$/, ''))
      toast('Image uploaded and attached to your email.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed.'
      setErrorMessage(message)
      toast(message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>, testOnly = false) {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    if (!subject.trim() || !body.trim()) {
      setErrorMessage('Enter both an email subject and a message.')
      return
    }
    if (!testOnly && estimatedRecipients > 1) {
      const ok = window.confirm(
        `Send "${subject.trim()}" to approximately ${estimatedRecipients} recipients right now?`,
      )
      if (!ok) return
    }

    setSending(testOnly ? 'test' : 'send')
    try {
      const cleanLinks = links
        .map(row => ({ label: row.label.trim(), url: row.url.trim() }))
        .filter(row => row.label || row.url)

      const response = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audience,
          projectId: audience === 'project_team' ? projectId : null,
          clubTeamId: audience === 'club_team' ? clubTeamId : null,
          discipline: audience === 'discipline' ? discipline : '',
          recipientUserIds: audience === 'individuals' ? selectedIds : [],
          customEmails,
          subject,
          eyebrow,
          body,
          imageUrl,
          imageAlt,
          ctaLabel,
          ctaUrl,
          links: cleanLinks,
          replyTo,
          alsoNotifyPortal,
          testOnly,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(describeSendFailure(response, result))
      }

      const msg = testOnly
        ? `Test email sent to ${senderEmail}.`
        : `Sent to ${result.sentCount} of ${result.recipientCount} recipients${result.notifiedCount ? ` (+${result.notifiedCount} portal notifications)` : ''}.`
      setStatusMessage(msg)
      toast(msg)

      if (!testOnly) {
        const refreshed = await fetch('/api/admin/email').then(r => r.json()).catch(() => null)
        if (refreshed?.history) setHistory(refreshed.history)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send email.'
      setErrorMessage(message)
      toast(message, 'error')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="email-studio-grid">
      <form className="pt-card pt-form" onSubmit={event => void submitEmail(event, false)}>
        <div className="pt-card-head">
          <h2>Audience</h2>
          <span className="pt-pill pt-pill--accent">
            <Users size={13} /> ~{estimatedRecipients} recipient{estimatedRecipients === 1 ? '' : 's'}
          </span>
        </div>

        <div className="pt-chips" role="group" aria-label="Choose email recipients">
          {AUDIENCE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className="pt-chip"
              aria-pressed={audience === tab.id}
              title={tab.hint}
              onClick={() => setAudience(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {audience === 'project_team' && (
          <label>
            Project team
            <select value={projectId} onChange={e => setProjectId(e.target.value)} required>
              {groups.projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.memberCount} member{project.memberCount === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </label>
        )}

        {audience === 'club_team' && (
          <label>
            Club team
            <select value={clubTeamId} onChange={e => setClubTeamId(e.target.value)} required>
              {groups.clubTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.memberCount} member{team.memberCount === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </label>
        )}

        {audience === 'discipline' && (
          <label>
            Engineering track
            <select value={discipline} onChange={e => setDiscipline(e.target.value)} required>
              {groups.disciplines.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name} ({item.count} member{item.count === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </label>
        )}

        {audience === 'individuals' && (
          <div className="email-people-picker">
            <label>
              Search members or officers
              <input
                type="search"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Type a name or @oberlin.edu email"
              />
            </label>
            <div className="email-people-list" role="group" aria-label="Select people to email">
              {filteredRecipients.map(person => {
                const checked = selectedIds.includes(person.id)
                return (
                  <label key={person.id} className={`email-person-check ${checked ? 'is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecipient(person.id)}
                    />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.email}</small>
                    </span>
                  </label>
                )
              })}
              {filteredRecipients.length === 0 && <p className="pt-hint">No matching members found.</p>}
            </div>
          </div>
        )}

        <label>
          {audience === 'custom' ? 'Recipient email addresses' : 'Additional email addresses (optional)'}
          <textarea
            rows={2}
            value={customEmails}
            onChange={e => setCustomEmails(e.target.value)}
            placeholder="person1@oberlin.edu, person2@oberlin.edu"
          />
          <small>Separate multiple addresses with commas or line breaks.</small>
        </label>

        <hr className="studio-divider" />

        <div className="pt-card-head">
          <h2>Message</h2>
        </div>

        <label>
          Subject
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={180}
            required
            placeholder="Build night this Thursday + project CAD files"
          />
        </label>

        <div className="pt-form-row">
          <label>
            Header label <small>Shown above title</small>
            <input value={eyebrow} onChange={e => setEyebrow(e.target.value)} maxLength={80} />
          </label>
          <label>
            Reply-to email <small>Optional</small>
            <input
              type="email"
              value={replyTo}
              onChange={e => setReplyTo(e.target.value)}
              placeholder="makers.engineers@oberlin.edu"
            />
          </label>
        </div>

        <label>
          Email body
          <textarea
            rows={8}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={12000}
            required
            placeholder="Share meeting times, project instructions, links, or updates. Separate paragraphs with a blank line."
          />
        </label>

        <div className="studio-subbox">
          <div className="pt-card-head">
            <h3>
              <ImageIcon size={16} /> Image banner <small>(optional)</small>
            </h3>
            <div className="pt-actions">
              <label className="button button--ghost pt-btn--small" style={{ cursor: 'pointer', margin: 0 }}>
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  disabled={uploading}
                  onChange={e => void handleImageUpload(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                className="pt-btn--small"
                onClick={() => setPickerOpen(prev => !prev)}
              >
                {pickerOpen ? 'Hide library' : 'Media library'}
              </button>
              {imageUrl && (
                <button type="button" className="pt-btn--small pt-btn--danger" onClick={() => setImageUrl('')}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {pickerOpen && (
            <div className="media-grid" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {mediaAssets.map(asset => (
                <button
                  key={asset.id}
                  type="button"
                  className={imageUrl === asset.publicUrl ? 'selected' : ''}
                  onClick={() => {
                    setImageUrl(asset.publicUrl)
                    setImageAlt(asset.altText || asset.fileName)
                    setPickerOpen(false)
                  }}
                >
                  <img src={asset.publicUrl} alt={asset.altText || asset.fileName} />
                  <span>{asset.fileName}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pt-form-row">
            <label>
              Image URL
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://... or /brand/..."
              />
            </label>
            <label>
              Image description (alt text)
              <input
                value={imageAlt}
                onChange={e => setImageAlt(e.target.value)}
                placeholder="Students assembling robot chassis"
              />
            </label>
          </div>
        </div>

        <div className="studio-subbox">
          <div className="pt-card-head">
            <h3>
              <Link2 size={16} /> Button & shared links <small>(optional)</small>
            </h3>
            <button
              type="button"
              className="pt-btn--small"
              onClick={() => setLinks(prev => [...prev, { label: '', url: '' }])}
            >
              <Plus size={14} /> Add link
            </button>
          </div>

          <div className="pt-form-row">
            <label>
              Primary button label
              <input
                value={ctaLabel}
                onChange={e => setCtaLabel(e.target.value)}
                maxLength={60}
                placeholder="Open project workspace"
              />
            </label>
            <label>
              Primary button link
              <input
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="/member/teams or https://..."
              />
            </label>
          </div>

          {links.map((item, idx) => (
            <div key={idx} className="email-link-row">
              <input
                aria-label={`Link ${idx + 1} label`}
                value={item.label}
                onChange={e =>
                  setLinks(prev => prev.map((row, n) => (n === idx ? { ...row, label: e.target.value } : row)))
                }
                placeholder="CAD specs / Google Doc"
              />
              <input
                aria-label={`Link ${idx + 1} URL`}
                value={item.url}
                onChange={e =>
                  setLinks(prev => prev.map((row, n) => (n === idx ? { ...row, url: e.target.value } : row)))
                }
                placeholder="https://... or /resources"
              />
              <button
                type="button"
                className="pt-btn--small pt-btn--danger"
                aria-label="Remove link"
                onClick={() => setLinks(prev => prev.filter((_, n) => n !== idx))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {audience !== 'custom' && audience !== 'pending_applicants' && (
          <label className="inline-check">
            <input
              type="checkbox"
              checked={alsoNotifyPortal}
              onChange={e => setAlsoNotifyPortal(e.target.checked)}
            />
            Also send a portal notification alert to signed-in members
          </label>
        )}

        {errorMessage && (
          <p className="portal-form-error" role="alert">
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p className="portal-save-feedback" role="status">
            <Check size={17} /> {statusMessage}
          </p>
        )}

        <div className="pt-actions">
          <button
            type="button"
            className="button button--ghost"
            disabled={Boolean(sending)}
            onClick={event => void submitEmail(event as unknown as FormEvent<HTMLFormElement>, true)}
          >
            <Sparkles size={16} /> {sending === 'test' ? 'Sending test...' : `Test to ${senderEmail}`}
          </button>
          <button type="submit" className="button button--cardinal" disabled={Boolean(sending)}>
            <Send size={16} />
            {sending === 'send' ? 'Sending...' : 'Send email'}
          </button>
        </div>
      </form>

      <aside className="pt-stack">
        <section className="pt-card" aria-label="Live email preview">
          <div className="pt-card-head">
            <h2>Live email preview</h2>
            <span className="portal-muted">HTML + Plain text</span>
          </div>
          <div className="email-preview-card">
            <header className="email-preview-card__head">
              <small>{eyebrow || 'Projects for Makers and Engineers @Oberlin'}</small>
              <h3>{subject.trim() || 'Your email subject appears here'}</h3>
            </header>
            <div className="email-preview-card__body">
              {imageUrl.trim() && (
                <img
                  src={imageUrl.trim()}
                  alt={imageAlt || 'Email header preview'}
                  className="email-preview-card__img"
                />
              )}
              <p className="portal-muted">Hi [Member Name],</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {body.trim() || 'Your formatted message, embedded image, button, and shared links appear here.'}
              </p>
              {ctaLabel.trim() && ctaUrl.trim() && (
                <div className="email-preview-card__cta">
                  <span>{ctaLabel.trim()}</span>
                </div>
              )}
              {links.some(l => l.label.trim() && l.url.trim()) && (
                <div className="email-preview-card__links">
                  <strong>Shared links</strong>
                  <ul>
                    {links
                      .filter(l => l.label.trim() && l.url.trim())
                      .map((l, idx) => (
                        <li key={idx}>
                          {l.label} <ExternalLink size={12} />
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pt-card" aria-label="Recent email sends">
          <div className="pt-card-head">
            <h2>
              <Mail size={17} /> Recent sends
            </h2>
          </div>
          {history.length ? (
            <ul className="pt-history">
              {history.map(item => (
                <li key={item.id}>
                  <strong>{item.subject}</strong>
                  <small>
                    {item.audienceLabel} · {item.sentCount}/{item.recipientCount} delivered ·{' '}
                    {formatPortalDate(item.createdAt)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-hint">No broadcast emails sent yet.</p>
          )}
        </section>
      </aside>
    </div>
  )
}
