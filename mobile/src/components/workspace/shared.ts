import { useCallback, useState } from 'react'
import { api, ApiError, errorMessage } from '@/lib/api'

export type MilestoneStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'
export type TeamPostKind = 'UPDATE' | 'WIN' | 'BLOCKER' | 'QUESTION'
export type Role = 'LEAD' | 'MEMBER'
export type RosterPerson = { userId: string; displayName: string; role: Role; joinedAt: string }
export type Milestone = { id: string; title: string; description: string; status: MilestoneStatus; dueDate: string | null; sortOrder: number; assigneeUserId: string | null; assigneeName: string | null; completedAt: string | null }
export type TeamUpdate = { id: string; title: string; summary: string; body: string; milestone: string; updateDate: string | null; reviewStatus: string; reviewFeedback: string | null; submittedAt: string; submittedBy: string; publicationState: string }
export type TeamPost = { id: string; kind: TeamPostKind; body: string; authorUserId: string | null; authorName: string; officer: boolean; createdAt: string }
export type TeamLink = { id: string; label: string; url: string; addedBy: string | null }
export type WorkLog = { id: string; authorUserId: string; authorName: string; body: string; createdAt: string; photos: { path: string; url: string }[] }
export type Application = { id: string; applicantName?: string; motivation: string; skills: string[] }
export type TeamRequest = { teamId: string; teamName: string; projectId: string; projectTitle: string; roster: { userId: string | null; displayName: string; role: Role }[] }
export type DirectoryPerson = { userId: string; displayName: string; major: string | null; skills: string[] }
export type Workspace = {
  me: string
  project: { id: string; title: string; slug: string; summary: string; status: string; publicationState: string; recruiting: boolean; startedAt: string | null; nextStep: string; githubUrl: string; externalUrl: string }
  myRole: Role
  roster: RosterPerson[]
  milestones: Milestone[]
  updates: TeamUpdate[]
  kickoff: { message: string; meetingAt: string | null; meetingLocation: string; createdAt: string } | null
  posts: TeamPost[]
  links: TeamLink[]
}
export type WorkspaceData = { me: string; isLead: boolean; started: boolean; workspace: Workspace; workLogs: WorkLog[]; applications: Application[]; teamRequests: TeamRequest[]; directory: DirectoryPerson[] }

/** What every section needs: who is looking, and how to reload after a change. */
export type Ctx = { projectId: string; me: string; isLead: boolean; reload: () => Promise<void> | void }

export const stageLabels: Record<string, string> = { proposed: 'Proposed', open_for_interest: 'Open for interest', scoping: 'Planning', active: 'Active', complete: 'Complete' }
export const milestoneStatusLabels: Record<MilestoneStatus, string> = { TODO: 'To do', IN_PROGRESS: 'In progress', BLOCKED: 'Blocked', DONE: 'Done' }
export const postKindLabels: Record<TeamPostKind, string> = { UPDATE: 'Progress update', WIN: 'Win', BLOCKER: 'Blocker', QUESTION: 'Question' }
export const stageLabel = (status: string) => stageLabels[status] ?? status.replaceAll('_', ' ')

export function relativeTime(value: string | null | undefined, now = Date.now()) {
  if (!value) return ''
  const minutes = Math.round((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}
export function formatDueDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
}
export function isOverdue(dueDate: string | null, status: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })) {
  return Boolean(dueDate && status !== 'DONE' && dueDate < today)
}

/** Copied from lib/projects/workspaceInput.ts. */
const messages: Record<string, string> = {
  PROJECT_LEAD_REQUIRED: 'Only a project lead can do that.',
  PROJECT_MEMBER_REQUIRED: 'You are no longer on this project team. Refresh the page.',
  SOLE_PROJECT_LEAD: 'You are the only lead. Ask a club officer to appoint another lead before you leave.',
  MILESTONE_ALREADY_CLAIMED: 'A teammate already took this milestone.',
  MILESTONE_NOT_YOURS: 'Only the person who took this milestone, or a lead, can hand it back.',
  MILESTONE_ASSIGNEE_NOT_ON_TEAM: 'Choose someone who is on the team.',
  MILESTONE_NOT_FOUND: 'This milestone was removed. Refresh the page.',
  CANNOT_REMOVE_PROJECT_LEAD: 'Leads can only be removed by a club officer.',
  TEAM_POST_FORBIDDEN: 'You can only delete your own posts.',
  TEAM_LINK_FORBIDDEN: 'Only the person who added this link, or a lead, can remove it.',
  TEAM_LINK_INVALID: 'Links must start with https:// or http://.',
  TEAM_LINK_LIMIT_REACHED: 'This team already has 30 links. Remove one first.',
  TEAM_UPDATE_NOT_EDITABLE: 'This update is not waiting on changes, so it cannot be edited.',
  TEAM_UPDATE_FORBIDDEN: 'Only the person who submitted this update, or a lead, can revise it.',
  PROJECT_UPDATE_TITLE_REQUIRED: 'Give the update a title of at least 3 characters.',
  PROJECT_UPDATE_CONTENT_REQUIRED: 'Add a summary or body of at least 10 characters.',
  ALREADY_INVITED: 'This member already has an open invitation.',
  ALREADY_PROJECT_MEMBER: 'This member is already on the team.',
  MEMBER_NOT_INVITABLE: 'This member cannot be invited right now.',
  APPLICANT_NOT_ACTIVE: 'This applicant no longer has an active membership.',
  PROJECT_NOT_STARTED: 'Workspaces open once a club officer starts the project.',
  WORK_LOG_REQUIRED: 'Write a short note or add at least one photo.',
  WORK_LOG_TOO_LONG: 'Keep the note under 4,000 characters.',
  WORK_LOG_TOO_MANY_PHOTOS: 'You can add up to 6 photos to one entry.',
  WORK_LOG_PHOTO_INVALID: 'One of the photos could not be read. Try a different photo.',
  WORK_LOG_PHOTO_TOO_LARGE: 'One of the photos is too large. Try a smaller photo.',
  WORK_LOG_UPLOAD_TOO_LARGE: 'These photos are too large to send together. Remove one and try again.',
  WORK_LOG_UPLOAD_FAILED: 'The photos could not be uploaded. Nothing was saved; please try again.',
  WORK_LOG_FORBIDDEN: 'You can only delete your own entries.',
  WORK_LOG_NOT_FOUND: 'This entry was already removed. Refresh the page.',
  PROJECT_APPLICATION_ALREADY_REVIEWED: 'This application was already handled. Refresh the page.',
}
export const workspaceErrorMessage = (code: string) => messages[code] ?? 'That change could not be saved. Please try again.'

/** A sentence for a failed workspace call. The team request route already sends a sentence, so show that as it is. */
export function workspaceError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'OFFLINE') return 'Could not reach the server. Nothing changed; please try again.'
    if (error.code === 'ACTIVE_MEMBER_REQUIRED' || error.code === 'SIGNED_OUT') return errorMessage(error)
    if (error.status === 413) return messages.WORK_LOG_UPLOAD_TOO_LARGE
    if (!messages[error.code] && error.code.includes(' ')) return error.code
    return workspaceErrorMessage(error.code)
  }
  return workspaceErrorMessage('')
}

/** Run one write against the team, show its notice, and reload the workspace after it succeeds. */
export function useWorkspaceAction(ctx: Ctx) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const call = useCallback(async (path: string, method: 'POST' | 'PUT' | 'DELETE', body: unknown, success = '', { reload = true } = {}) => {
    if (busy) return false
    setBusy(true); setError(''); setMessage('')
    try {
      await api(path, { method, body })
      setMessage(success)
      if (reload) await ctx.reload()
      return true
    } catch (caught) { setError(workspaceError(caught)); return false }
    finally { setBusy(false) }
  }, [busy, ctx])
  const run = useCallback((action: Record<string, unknown>, success = '', options?: { reload?: boolean }) => call(`/api/member/projects/${ctx.projectId}`, 'PUT', action, success, options), [call, ctx.projectId])
  return { run, call, busy, error, message, setError, setMessage }
}
