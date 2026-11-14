import 'server-only'
import { sendTransactionalEmail, sendTransactionalEmailBatch } from '@/lib/email/client'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'
import { projectDeletedEmail, projectMemberRemovedEmail } from '@/lib/email/templates'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const myTeamsUrl = () => `${memberSiteOrigin()}/member/teams`

/**
 * Email someone that they were taken off a project team, by an officer or a project lead.
 * Call it only after the removal RPC succeeded: the lookups here use the service role, so
 * that RPC is what checks the caller was allowed to remove them. Never throws, because the
 * removal itself already happened; returns whether the email was accepted for delivery.
 */
export async function emailRemovedProjectMember(projectId: string, userId: string): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient()
    const [{ data: member }, { data: project }] = await Promise.all([
      admin.from('member_profiles').select('display_name,oberlin_email').eq('user_id', userId).maybeSingle(),
      admin.from('projects').select('title').eq('id', projectId).maybeSingle(),
    ])
    if (!member?.oberlin_email || !project?.title) return false
    return await sendTransactionalEmail({
      to: member.oberlin_email,
      message: projectMemberRemovedEmail({
        memberName: member.display_name || member.oberlin_email,
        projectTitle: project.title,
        actionUrl: myTeamsUrl(),
      }),
      required: false,
    })
  } catch {
    return false
  }
}

/**
 * Email everyone who was on a project that officers just deleted. The roster has to be read
 * before the delete, since memberships cascade away with the project. Never throws; returns
 * how many emails were accepted.
 */
export async function emailDeletedProjectTeam(
  projectId: string,
  projectTitle: string,
  roster: Array<{ displayName: string; email: string }>,
): Promise<number> {
  const recipients = roster.filter(person => person.email)
  if (!recipients.length) return 0
  try {
    return await sendTransactionalEmailBatch({
      idempotencyKey: `project-deleted/${projectId}`,
      messages: recipients.map(person => ({
        to: person.email,
        message: projectDeletedEmail({ memberName: person.displayName, projectTitle, actionUrl: myTeamsUrl() }),
      })),
    })
  } catch {
    return 0
  }
}
