import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Body, Button, Card, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions, Avatar, PickList, confirmAction } from './bits'
import { useWorkspaceAction, type Ctx, type DirectoryPerson, type RosterPerson } from './shared'

export function Roster({ ctx, roster }: { ctx: Ctx; roster: RosterPerson[] }) {
  const action = useWorkspaceAction(ctx)
  return <Card>
    <Heading>Team</Heading>
    <Muted>{`${roster.length} ${roster.length === 1 ? 'person' : 'people'}`}</Muted>
    <Notice error={action.error}/>
    <View>{roster.map((person, index) => <View key={person.userId} style={[styles.person, index > 0 && styles.line]}>
      <Avatar name={person.displayName} lead={person.role === 'LEAD'}/>
      <View style={styles.name}>
        <Text style={styles.nameText}>{person.displayName}</Text>
        <Text style={styles.role}>{person.role === 'LEAD' ? 'Project lead' : 'Team member'}</Text>
      </View>
      {ctx.isLead && person.role !== 'LEAD' ? <Button label="Remove" kind="secondary" disabled={action.busy} onPress={() => confirmAction(`Remove ${person.displayName} from the project team?`, 'Remove', () => void action.run({ action: 'remove-member', userId: person.userId }))}/> : null}
    </View>)}</View>
  </Card>
}

export function InviteMember({ ctx, directory, roster }: { ctx: Ctx; directory: DirectoryPerson[]; roster: RosterPerson[] }) {
  const action = useWorkspaceAction(ctx)
  const [member, setMember] = useState(''), [note, setNote] = useState('')
  const existing = new Set(roster.map(person => person.userId))
  const options = directory.filter(person => person.displayName && !existing.has(person.userId)).map(person => ({ value: person.userId, label: `${person.displayName}${person.major ? ` · ${person.major}` : ''}` }))
  async function submit() {
    if (!member) return
    if (await action.call('/api/member/project-invitations', 'POST', { projectId: ctx.projectId, invitedUserId: member, message: note }, 'Invitation sent. The member must accept before joining.', { reload: false })) { setMember(''); setNote('') }
  }
  return <Card>
    <Heading>Invite a member</Heading>
    <Muted>Only members who chose to appear in the member directory are listed.</Muted>
    {options.length ? <>
      <PickList label="Member" options={options} value={member} onChange={setMember} empty=""/>
      <Field label="Message" multiline value={note} onChangeText={setNote} placeholder="What would you like them to work on?"/>
      <Notice error={action.error} message={action.message}/>
      <Actions><Button label={action.busy ? 'Sending...' : 'Send invitation'} icon="send-outline" busy={action.busy} disabled={!member} onPress={() => void submit()}/></Actions>
    </> : <Muted>No additional visible members to invite right now.</Muted>}
  </Card>
}

export function LeaveProject({ ctx, projectTitle, soleLead }: { ctx: Ctx; projectTitle: string; soleLead: boolean }) {
  const action = useWorkspaceAction(ctx)
  function leave() {
    confirmAction(`Leave "${projectTitle}"?`, 'Leave project', async () => { if (await action.run({ action: 'leave' }, 'You left the project.', { reload: false })) router.replace('/teams') }, 'You will lose access to this workspace. Your posts stay for the team.')
  }
  return <Card>
    <Heading>Leave this project</Heading>
    <Body style={{ fontSize: text.small, color: colors.muted }}>{soleLead ? 'You are the only lead. Ask a club officer to appoint another lead before you leave, so the team is not stranded.' : 'If you can no longer take part, let your team know in the feed, then leave.'}</Body>
    <Notice error={action.error}/>
    <Actions><Button label={action.busy ? 'Leaving...' : 'Leave project'} icon="log-out-outline" kind="danger" disabled={action.busy || soleLead} onPress={leave}/></Actions>
  </Card>
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  name: { flex: 1 },
  nameText: { fontSize: text.body, fontWeight: '600', color: colors.ink },
  role: { fontSize: text.small, color: colors.muted },
})
