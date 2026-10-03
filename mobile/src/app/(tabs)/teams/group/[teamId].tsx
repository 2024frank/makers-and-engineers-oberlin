import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Link, router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Field, Heading, Loading, Muted, Notice, Screen, Title } from '@/components/ui'
import { Check, PickList, TeamRoster, confirmThen, useTeamAction, type ClubTeam, type DirectoryMember, type TeamAction, type TeamProject } from '@/components/teams/shared'
import { colors, text } from '@/lib/theme'
import { useApi } from '@/lib/useApi'

type Response = { team: ClubTeam; members: DirectoryMember[]; projects: { id: string; title: string }[] }
type Done = { onDone: () => void }

function ActionButton({ input, label, success, confirm, onDone, kind = 'secondary' }: { input: TeamAction; label: string; success: string; confirm?: string; kind?: 'primary' | 'secondary' } & Done) {
  const action = useTeamAction(onDone)
  return <View style={styles.gap}>
    <Button label={action.busy ? 'Saving...' : label} kind={kind} busy={action.busy} onPress={() => confirm ? confirmThen(confirm, () => void action.run(input, success)) : void action.run(input, success)}/>
    <Notice error={action.error} message={action.message}/>
  </View>
}

function ProjectReview({ teamId, project, onDone }: { teamId: string; project: TeamProject } & Done) {
  const action = useTeamAction(onDone)
  return <View style={styles.gap}>
    <Muted>Approval gives the team's current and future members project access. Existing project leads keep their roles.</Muted>
    <Button label="Approve team" icon="checkmark" busy={action.busy} onPress={() => void action.run({ action: 'review-project', teamId, projectId: project.id, decision: 'APPROVE' }, 'Team approved for this project.')}/>
    <Button label="Decline" icon="close" kind="secondary" disabled={action.busy} onPress={() => void action.run({ action: 'review-project', teamId, projectId: project.id, decision: 'REJECT' }, 'Request declined.')}/>
    <Notice error={action.error} message={action.message}/>
  </View>
}

function JoinTeam({ team, onDone }: { team: ClubTeam } & Done) {
  const action = useTeamAction(onDone)
  const [message, setMessage] = useState('')
  if (team.myRequest?.status === 'PENDING') return team.myRequest.direction === 'INVITE'
    ? <Link href="/projects/invitations" style={styles.link}>You have an invitation. Review it in Invitations.</Link>
    : <Notice message="Your request is waiting for the team lead."/>
  if (!team.recruiting) return <Muted>This team is not taking requests right now.</Muted>
  return <View style={styles.gap}>
    <Field label="Message to the team" value={message} onChangeText={setMessage} maxLength={1200} multiline editable={!action.busy}/>
    <Button label="Request to join" icon="send" busy={action.busy} disabled={Boolean(action.message)} onPress={() => void action.run({ action: 'join', teamId: team.id, message }, 'Request sent to the team lead.')}/>
    <Notice error={action.error} message={action.message}/>
  </View>
}

function InviteTeammate({ team, members, inviteUserId, onDone }: { team: ClubTeam; members: DirectoryMember[]; inviteUserId?: string } & Done) {
  const action = useTeamAction(onDone)
  const options = members.filter(member => member.displayName && !team.roster.some(person => person.userId === member.userId) && !team.requests.some(request => request.userId === member.userId && request.status === 'PENDING'))
  const [memberId, setMemberId] = useState(options.some(member => member.userId === inviteUserId) ? inviteUserId! : ''), [message, setMessage] = useState('')
  async function send() {
    const result = await action.run({ action: 'invite', teamId: team.id, userId: memberId, message }, 'Invitation sent. They must accept before joining.')
    if (result) { setMemberId(''); setMessage('') }
  }
  return <View style={styles.gap}>
    <Heading>Invite a teammate</Heading>
    {options.length ? <>
      <PickList label="Member" value={memberId} onChange={setMemberId} options={options.map(member => ({ value: member.userId, label: `${member.displayName}${member.skills?.length ? ` · ${member.skills.join(', ')}` : ''}` }))}/>
      <Field label="Message" value={message} onChangeText={setMessage} maxLength={1200} multiline editable={!action.busy}/>
      <Button label={action.busy ? 'Sending...' : 'Send invitation'} icon="send" busy={action.busy} disabled={!memberId} onPress={send}/>
      <Notice error={action.error} message={action.message}/>
    </> : <Muted>No more visible members to invite. Members with private profiles can request to join this team.</Muted>}
  </View>
}

function ChooseProject({ team, projects, onDone }: { team: ClubTeam; projects: { id: string; title: string }[] } & Done) {
  const action = useTeamAction(onDone)
  const [projectId, setProjectId] = useState('')
  const options = projects.filter(project => !team.projects.some(existing => existing.id === project.id && existing.status !== 'REJECTED'))
  return <View style={styles.gap}>
    <Heading>Choose a project</Heading>
    {options.length ? <>
      <PickList label="Existing project" value={projectId} onChange={setProjectId} options={options.map(project => ({ value: project.id, label: project.title }))}/>
      <Button label="Request project access" icon="send" busy={action.busy} disabled={!projectId} onPress={() => void action.run({ action: 'request-project', teamId: team.id, projectId }, 'Request sent. A project lead or officer will review it.')}/>
      <Notice error={action.error} message={action.message}/>
    </> : <Muted>No other projects are accepting teams right now.</Muted>}
    <Link href={{ pathname: '/projects/proposals', params: { new: '1', team: team.id } }} style={styles.link}>Propose a project for this team</Link>
  </View>
}

function TeamSettings({ team, onDone }: { team: ClubTeam } & Done) {
  const action = useTeamAction(onDone)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(team.name), [description, setDescription] = useState(team.description), [recruiting, setRecruiting] = useState(team.recruiting)
  return <View style={styles.gap}>
    <Button label="Team settings" kind="secondary" icon={open ? 'chevron-up' : 'chevron-down'} onPress={() => setOpen(!open)}/>
    {open ? <Card>
      <Field label="Team name" value={name} onChangeText={setName} maxLength={80} autoCorrect={false}/>
      <Field label="Description" value={description} onChangeText={setDescription} maxLength={1200} multiline/>
      <Check label="Accept join requests" value={recruiting} onChange={setRecruiting}/>
      <Button label="Save changes" busy={action.busy} disabled={name.trim().length < 3} onPress={() => void action.run({ action: 'update', teamId: team.id, name: name.trim(), description: description.trim(), recruiting }, 'Team details saved.')}/>
      <Notice error={action.error} message={action.message}/>
    </Card> : null}
  </View>
}

export default function ClubTeamScreen() {
  const { teamId, invite } = useLocalSearchParams<{ teamId: string; invite?: string }>()
  const { data, error, loading, refreshing, reload } = useApi<Response>(teamId ? `/api/mobile/teams/group/${teamId}` : null)
  if (!data) return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: 'Team' }}/>
    {loading || !error ? <Loading/> : <ErrorState error={error} onRetry={reload} messages={{ TEAM_NOT_FOUND: 'This team could not be found.' }}/>}
  </Screen>
  const { team, members, projects } = data
  const lead = team.myRole === 'LEAD'
  const done = () => void reload()
  return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: team.name }}/>
    <Title>{team.name}</Title>
    {team.description ? <Body>{team.description}</Body> : null}
    <Muted>{`${team.myRole ? 'Your team' : 'Club team'} · ${team.recruiting ? 'Recruiting' : 'Not recruiting'}`}</Muted>

    <Card>
      <Heading>{`Members ${team.roster.length}`}</Heading>
      <TeamRoster people={team.roster}/>
      {lead ? team.roster.filter(person => person.role !== 'LEAD' && person.userId).map(person => <View style={styles.member} key={person.userId}>
        <Body style={styles.bold}>{person.displayName}</Body>
        <ActionButton onDone={done} label="Make team lead" input={{ action: 'transfer', teamId: team.id, userId: person.userId! }} success="Team lead changed." confirm={`Make ${person.displayName} the team lead? You will become a regular team member.`}/>
        <ActionButton onDone={done} label="Remove" input={{ action: 'remove', teamId: team.id, userId: person.userId! }} success="Member removed from this team." confirm={`Remove ${person.displayName} from this team?`}/>
      </View>) : null}
      {!team.myRole ? <JoinTeam team={team} onDone={done}/> : null}
      {team.myRole === 'MEMBER' ? <ActionButton onDone={done} label="Leave team" input={{ action: 'leave', teamId: team.id }} success="You left the team." confirm="Leave this team? Access through this team will end."/> : null}
    </Card>

    {lead && team.requests.length > 0 ? <Card>
      <Heading>Invitations and requests</Heading>
      {team.requests.map(request => <View style={styles.member} key={request.userId}>
        <Body style={styles.bold}>{request.displayName}</Body>
        <Muted>{`${request.direction === 'INVITE' ? 'Invitation sent' : 'Wants to join'} · ${request.status.toLowerCase()}`}</Muted>
        {request.message ? <Body>{request.message}</Body> : null}
        {request.status === 'PENDING' ? request.direction === 'JOIN' ? <>
          <ActionButton onDone={done} kind="primary" label="Accept request" input={{ action: 'review-member', teamId: team.id, userId: request.userId, decision: 'ACCEPT' }} success="Member added to the team."/>
          <ActionButton onDone={done} label="Decline" input={{ action: 'review-member', teamId: team.id, userId: request.userId, decision: 'DECLINE' }} success="Request declined."/>
        </> : <ActionButton onDone={done} label="Cancel invitation" input={{ action: 'revoke', teamId: team.id, userId: request.userId }} success="Invitation cancelled."/> : null}
      </View>)}
    </Card> : null}

    {lead ? <Card><InviteTeammate team={team} members={members} inviteUserId={typeof invite === 'string' ? invite : undefined} onDone={done}/></Card> : null}

    <Card>
      <Heading>Projects</Heading>
      {team.projects.length ? team.projects.map(project => <View style={styles.member} key={project.id}>
        <Body style={styles.bold}>{project.title}</Body>
        <Muted>{project.status === 'PENDING' ? 'Awaiting approval' : project.status === 'REJECTED' ? 'Request declined' : 'Approved'}</Muted>
        {project.status === 'APPROVED' && project.canAccess && team.myRole ? <Button label="Open project workspace" kind="secondary" icon="arrow-forward" onPress={() => router.push(`/teams/${project.id}`)}/> : null}
        {project.status === 'PENDING' && project.canReview ? <ProjectReview teamId={team.id} project={project} onDone={done}/> : null}
      </View>) : <Muted>No project selected yet.</Muted>}
    </Card>

    {lead ? <Card><ChooseProject team={team} projects={projects} onDone={done}/></Card> : null}

    {team.proposals.length > 0 ? <Card>
      <Heading>Team proposals</Heading>
      {team.proposals.map(proposal => <View style={styles.member} key={proposal.id}>
        <Body style={styles.bold}>{proposal.title}</Body>
        <Muted>{proposal.status === 'PENDING' ? 'Awaiting officer review' : proposal.status.toLowerCase()}</Muted>
        {proposal.feedback ? <Body>{proposal.feedback}</Body> : null}
      </View>)}
    </Card> : null}

    {lead ? <TeamSettings team={team} onDone={done}/> : null}
  </Screen>
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  member: { gap: 8, paddingTop: 6 },
  bold: { fontWeight: '600' },
  link: { fontSize: text.body, fontWeight: '600', color: colors.accent, minHeight: 44, paddingVertical: 10 },
})
