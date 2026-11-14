import { notFound } from 'next/navigation'
import { z } from 'zod'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
import { ProjectTeamManager } from '@/components/admin/projects/ProjectTeamManager'
import { requireAdmin } from '@/lib/auth/requireRole'
import { can } from '@/lib/permissions/can'
import { loadUnifiedAdminProject } from '@/lib/projects/adminProjectView'
import '@/components/projects/project-teams.css'

export const dynamic = 'force-dynamic'

export default async function ProjectTeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') {
    return (
      <AccessDenied
        title="Admin access required"
        body="Only Admins and Super Admins can manage project teams."
      />
    )
  }
  const { projectId } = await params
  if (!z.string().uuid().safeParse(projectId).success) notFound()

  const data = await loadUnifiedAdminProject(projectId)
  if (!data) notFound()

  const canPublish = can(admin.role, 'PUBLISH_CONTENT', admin.scopes, 'projects')

  return (
    <main className="admin-panel pt-page">
      <ProjectTeamManager
        team={data.team}
        members={data.members}
        projectDraft={data.projectDraft}
        mediaAssets={data.mediaAssets}
        canPublish={canPublish}
        sharedFiles={data.sharedFiles}
        currentUserId={admin.userId}
      />
    </main>
  )
}
