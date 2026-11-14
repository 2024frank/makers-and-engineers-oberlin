import 'server-only'
import { listAdminContent } from '@/lib/cms/adminContent'
import { listMedia } from '@/lib/cms/media'
import { getAdminProjectTeam, listActiveMemberChoices } from '@/lib/projects/teamAdmin'
import { listProjectSharedFiles } from '@/lib/projects/teamFiles'

export async function loadUnifiedAdminProject(projectId: string) {
  const [team, members, projectRows, mediaAssets, sharedFiles] = await Promise.all([
    getAdminProjectTeam(projectId).catch(error => {
      if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') return null
      throw error
    }),
    listActiveMemberChoices(),
    listAdminContent('projects').catch(() => []),
    listMedia().catch(() => []),
    listProjectSharedFiles(projectId).catch(() => []),
  ])
  if (!team) return null
  const contentRow = projectRows.find(row => row.id === projectId)
  const projectDraft = contentRow
    ? {
        payload: contentRow.payload,
        hasDraft: contentRow.hasDraft,
        updatedAt: contentRow.updatedAt,
      }
    : undefined
  return {
    team,
    members,
    projectDraft,
    mediaAssets,
    sharedFiles,
  }
}
