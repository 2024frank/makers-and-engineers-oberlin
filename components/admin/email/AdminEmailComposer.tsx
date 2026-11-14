'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Check, Mail, Send, Sparkles, Users } from 'lucide-react'
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

type Props = {
  senderEmail: string
  recipients: EmailRecipientChoice[]
  groups: EmailGroupChoice
  initialHistory: EmailBroadcastHistoryEntry[]
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
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [alsoNotifyPortal, setAlsoNotifyPortal] = useState(true)

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
          body,
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

        <label>
          Message
          <textarea
            rows={8}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={12000}
            required
            placeholder="Share meeting times, project instructions, links, or updates. Separate paragraphs with a blank line."
          />
          <small>Sent as plain text, exactly as you type it.</small>
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
