export const plural = (count: number, one: string, many: string) => count === 1 ? one : many

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

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' }).format(new Date(value))
}

export const milestoneStatusLabels = { TODO: 'To do', IN_PROGRESS: 'In progress', BLOCKED: 'Blocked', DONE: 'Done' } as const
export const postKindLabels = { UPDATE: 'Progress update', WIN: 'Win', BLOCKER: 'Blocker', QUESTION: 'Question' } as const
