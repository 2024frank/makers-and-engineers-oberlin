import { useState } from 'react'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Heading, Loading, Muted, Notice, Row, Screen, Title } from '@/components/ui'
import { failure } from '@/components/projects/bits'
import type { ClubInvitation, TeamInvite } from '@/components/projects/types'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/lib/useApi'

type Decision = 'ACCEPT' | 'DECLINE'

export default function Invitations() {
  const { data, error, refreshing, reload } = useApi<{ projects: TeamInvite[]; teams: ClubInvitation[] }>('/api/mobile/invitations')
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [problem, setProblem] = useState('')
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const header = <Stack.Screen options={{ title: 'Invitations' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload}/> : <Loading/>}</>

  async function respondToTeam(invitation: ClubInvitation, decision: Decision) {
    setBusy(invitation.teamId); setMessage(''); setProblem('')
    try {
      const { result } = await api<{ result: { teamId: string; status: string | null } }>('/api/member/teams', { method: 'POST', body: { action: 'respond', teamId: invitation.teamId, decision } })
      const expected = decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
      setMessage(result.status === 'EXPIRED' ? 'This invitation expired. Ask the team lead for a new one.' : result.status !== expected ? `This invitation was already answered. Status: ${result.status?.toLowerCase() ?? 'unavailable'}.` : decision === 'ACCEPT' ? 'You joined the team.' : 'Invitation declined.')
      if (result.status) setStatuses(current => ({ ...current, [invitation.teamId]: result.status as string }))
      await reload()
    } catch (caught) {
      // The team route answers with ready-made sentences.
      setProblem(caught instanceof ApiError && caught.code.includes(' ') ? caught.code : failure(caught, {}, 'The change could not be saved. Please try again.'))
    } finally { setBusy('') }
  }

  async function respondToProject(invite: TeamInvite, decision: Decision) {
    setBusy(invite.id); setMessage(''); setProblem('')
    try {
      const { result } = await api<{ result?: { status?: string } }>('/api/member/project-invitations', { method: 'PUT', body: { inviteId: invite.id, decision } })
      setMessage(result?.status === 'EXPIRED' ? 'This invitation expired. Ask the project lead to send a new one.' : decision === 'ACCEPT' ? 'You joined the project team.' : 'Invitation declined.')
      await reload()
    } catch (caught) { setProblem(failure(caught, { PROJECT_INVITE_ALREADY_RESPONDED: 'You already answered this invitation.' }, 'Could not respond. Please try again.')) }
    finally { setBusy('') }
  }

  const pending = data.projects.filter(invite => invite.status === 'PENDING')
  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <Title>Invitations</Title>
    <Muted>Accept an invitation to join the team or project.</Muted>
    <Notice message={message} error={problem}/>

    <Heading>Team invitations</Heading>
    {data.teams.length ? data.teams.map(invitation => {
      const status = statuses[invitation.teamId] ?? invitation.status
      return <Card key={invitation.teamId}>
        <Row title={invitation.teamName} onPress={() => router.push(`/teams/group/${invitation.teamId}`)} last/>
        {invitation.message ? <Body>{invitation.message}</Body> : null}
        <Muted>{status === 'PENDING' ? `Expires ${new Date(invitation.expiresAt).toLocaleDateString('en-US')}` : status.toLowerCase()}</Muted>
        {status === 'PENDING' ? <>
          <Button label="Accept invitation" icon="checkmark" busy={busy === invitation.teamId} disabled={Boolean(busy)} onPress={() => void respondToTeam(invitation, 'ACCEPT')}/>
          <Button label="Decline" icon="close" kind="secondary" disabled={Boolean(busy)} onPress={() => void respondToTeam(invitation, 'DECLINE')}/>
        </> : null}
      </Card>
    }) : <Muted>No team invitations yet.</Muted>}

    <Heading>Project invitations</Heading>
    {pending.length ? pending.map(invite => <Card key={invite.id}>
      <Heading>{invite.projectTitle}</Heading>
      <Body>Invited by <Body style={{ fontWeight: '700' }}>{invite.inviterName ?? 'a Project Lead'}</Body>.</Body>
      {invite.message ? <Body>{invite.message}</Body> : null}
      <Muted>Expires {new Date(invite.expiresAt).toLocaleDateString()}</Muted>
      <Button label="Accept" icon="checkmark" busy={busy === invite.id} disabled={Boolean(busy)} onPress={() => void respondToProject(invite, 'ACCEPT')}/>
      <Button label="Decline" icon="close" kind="secondary" disabled={Boolean(busy)} onPress={() => void respondToProject(invite, 'DECLINE')}/>
    </Card>) : <>
      <Body>No pending invitations.</Body>
      <Muted>Project Lead invitations will appear here.</Muted>
    </>}
  </Screen>
}
