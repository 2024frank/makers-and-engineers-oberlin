import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Body, Button, Card, Heading, Muted, Notice } from '@/components/ui'
import { colors } from '@/lib/theme'
import { Actions } from './bits'
import { useWorkspaceAction, type Application, type Ctx, type TeamRequest } from './shared'

/** Lead only: club teams asking for access to this project. */
export function TeamProjectRequests({ ctx, requests }: { ctx: Ctx; requests: TeamRequest[] }) {
  const action = useWorkspaceAction(ctx)
  if (!requests.length) return null
  const decide = (request: TeamRequest, decision: 'APPROVE' | 'REJECT') => action.call('/api/member/teams', 'POST', { action: 'review-project', teamId: request.teamId, projectId: request.projectId, decision }, decision === 'APPROVE' ? 'Team approved for this project.' : 'Request declined.')
  return <Card>
    <Heading>Team project requests</Heading>
    <Notice error={action.error} message={action.message}/>
    {requests.map(request => <View key={`${request.teamId}-${request.projectId}`} style={styles.item}>
      <Body style={styles.bold}>{request.teamName}</Body>
      <Muted>{`${request.projectTitle} · ${request.roster.length} member${request.roster.length === 1 ? '' : 's'}`}</Muted>
      <Muted>{request.roster.map(person => person.displayName).join(', ')}</Muted>
      <Muted>Approval gives the team's current and future members project access. Existing project leads keep their roles.</Muted>
      <Actions>
        <Button label="Approve team" icon="checkmark" disabled={action.busy} onPress={() => void decide(request, 'APPROVE')}/>
        <Button label="Decline" icon="close" kind="secondary" disabled={action.busy} onPress={() => void decide(request, 'REJECT')}/>
      </Actions>
    </View>)}
  </Card>
}

/** Lead only: members who applied to join this project. */
export function ApplicationReviewList({ ctx, applications }: { ctx: Ctx; applications: Application[] }) {
  const action = useWorkspaceAction(ctx)
  const [busyId, setBusyId] = useState('')
  if (!applications.length) return null
  async function decide(id: string, decision: 'ACCEPT' | 'REJECT') {
    setBusyId(id)
    await action.call('/api/member/project-applications', 'PUT', { applicationId: id, decision }, decision === 'ACCEPT' ? 'Applicant added to the team.' : 'Application declined.')
    setBusyId('')
  }
  return <Card>
    <Heading>Waiting to join</Heading>
    <Muted>{String(applications.length)}</Muted>
    <Notice error={action.error} message={action.message}/>
    {applications.map(app => <View key={app.id} style={styles.item}>
      <Body style={styles.bold}>{app.applicantName ?? 'Member'}</Body>
      <Body>{app.motivation}</Body>
      {app.skills.length > 0 ? <Muted>{app.skills.join(', ')}</Muted> : null}
      <Actions>
        <Button label="Add to team" busy={busyId === app.id} disabled={action.busy} onPress={() => void decide(app.id, 'ACCEPT')}/>
        <Button label="Decline" kind="secondary" disabled={action.busy} onPress={() => void decide(app.id, 'REJECT')}/>
      </Actions>
    </View>)}
  </Card>
}

const styles = StyleSheet.create({
  item: { gap: 6, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  bold: { fontWeight: '700' },
})
