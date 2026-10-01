// Safe to import from client components; the server helper lives in contentDelete.ts.
export const deletableContentTypes = ['events', 'news_posts', 'resources', 'opportunities', 'documents', 'sponsors', 'leaders', 'project_updates'] as const
export type DeletableContentType = typeof deletableContentTypes[number]

const messages: Record<string, string> = {
  CONTENT_DELETE_FORBIDDEN: 'Only an Admin or Super Admin can delete content.',
  CONTENT_NOT_FOUND: 'This item no longer exists. Refresh the page.',
  CONTENT_DELETE_UNSUPPORTED: 'This kind of item cannot be deleted here.',
  OFFICER_POSITION_HAS_HISTORY: 'People have applied for, or been emailed about, this officer position, so it is kept as a record. Edit it and turn off "Current" instead.',
  FORBIDDEN: 'Only an Admin or Super Admin can delete content.',
}
export function contentDeleteMessage(code: unknown) {
  return (typeof code === 'string' && messages[code]) || 'Could not delete this item. Nothing was removed; refresh and try again.'
}
