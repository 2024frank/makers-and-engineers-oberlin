import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Choice, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions, Meta, ProgressBar, confirmAction } from './bits'
import { formatDueDate, isOverdue, milestoneStatusLabels, useWorkspaceAction, type Ctx, type Milestone, type MilestoneStatus, type RosterPerson } from './shared'

const statuses = (Object.keys(milestoneStatusLabels) as MilestoneStatus[]).map(value => ({ value, label: milestoneStatusLabels[value] }))

export function MilestoneBoard({ ctx, milestones, roster }: { ctx: Ctx; milestones: Milestone[]; roster: RosterPerson[] }) {
  const { me, isLead } = ctx
  const action = useWorkspaceAction(ctx)
  const [editing, setEditing] = useState(''), [adding, setAdding] = useState(false)
  const done = milestones.filter(m => m.status === 'DONE').length
  const mine = milestones.filter(m => m.assigneeUserId === me && m.status !== 'DONE').length
  function setStatus(milestone: Milestone, status: MilestoneStatus) {
    if (status === milestone.status) return
    void action.run({ action: 'milestone-status', milestoneId: milestone.id, status }, status === 'DONE' ? `"${milestone.title}" is done and your team was notified.` : `"${milestone.title}" moved to ${milestoneStatusLabels[status].toLowerCase()}.`)
  }
  return <Card>
    <Heading>Milestones</Heading>
    {milestones.length > 0 ? <>
      <Muted>{`${done} of ${milestones.length} done${mine ? ` · ${mine} yours` : ''}`}</Muted>
      <ProgressBar done={done} total={milestones.length}/>
    </> : null}
    <Notice error={action.error} message={action.message}/>
    {milestones.length ? <View style={styles.list}>{milestones.map(milestone => {
      const overdue = isOverdue(milestone.dueDate, milestone.status)
      const canHandBack = milestone.assigneeUserId === me || (isLead && milestone.assigneeUserId)
      return <View key={milestone.id} style={styles.item}>
        <Text style={[styles.title, milestone.status === 'DONE' && styles.titleDone]}>{milestone.title}</Text>
        {milestone.description ? <Body>{milestone.description}</Body> : null}
        <Meta>{milestone.assigneeUserId === me ? 'You own this' : milestone.assigneeName ? `Owner: ${milestone.assigneeName}` : 'No owner yet'}</Meta>
        {milestone.dueDate ? <Meta tone={overdue ? 'danger' : undefined}>{`${overdue ? 'Overdue: ' : 'Due '}${formatDueDate(milestone.dueDate)}`}</Meta> : null}
        <Choice label={`Status of ${milestone.title}`} options={statuses} value={milestone.status} onChange={status => { if (!action.busy) setStatus(milestone, status) }}/>
        <Actions>
          {!milestone.assigneeUserId && milestone.status !== 'DONE' ? <Button label="I'll take it" icon="hand-left-outline" kind="secondary" disabled={action.busy} onPress={() => void action.run({ action: 'milestone-claim', milestoneId: milestone.id, claim: true }, `You took "${milestone.title}".`)}/> : null}
          {canHandBack && milestone.status !== 'DONE' ? <Button label="Hand back" kind="secondary" disabled={action.busy} onPress={() => void action.run({ action: 'milestone-claim', milestoneId: milestone.id, claim: false }, 'Owner cleared.')}/> : null}
          {isLead ? <Button label="Edit" icon="pencil-outline" kind="secondary" onPress={() => setEditing(editing === milestone.id ? '' : milestone.id)}/> : null}
          {isLead ? <Button label="Delete" icon="trash-outline" kind="danger" disabled={action.busy} onPress={() => confirmAction(`Delete the milestone "${milestone.title}"?`, 'Delete', () => void action.run({ action: 'milestone-delete', milestoneId: milestone.id }, 'Milestone deleted.'))}/> : null}
        </Actions>
        {isLead && editing === milestone.id ? <MilestoneForm ctx={ctx} roster={roster} milestone={milestone} onDone={() => setEditing('')}/> : null}
      </View>
    })}</View> : <Muted>{isLead ? 'Break the project into a few concrete steps so everyone knows what to pick up.' : 'Your project lead has not added milestones yet. Ask in the team feed what you can start on.'}</Muted>}
    {isLead ? adding ? <MilestoneForm ctx={ctx} roster={roster} onDone={() => setAdding(false)}/> : <Actions><Button label="Add a milestone" icon="add" kind="secondary" onPress={() => setAdding(true)}/></Actions> : null}
  </Card>
}

function MilestoneForm({ ctx, roster, milestone, onDone }: { ctx: Ctx; roster: RosterPerson[]; milestone?: Milestone; onDone: () => void }) {
  const action = useWorkspaceAction(ctx)
  const [title, setTitle] = useState(milestone?.title ?? ''), [details, setDetails] = useState(milestone?.description ?? '')
  const [owner, setOwner] = useState(milestone?.assigneeUserId ?? ''), [due, setDue] = useState(milestone?.dueDate ?? '')
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? 'TODO')
  const [invalid, setInvalid] = useState('')
  async function submit() {
    setInvalid('')
    if (title.trim().length < 2) { setInvalid('Give the milestone a name of at least 2 characters.'); return }
    if (due.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(due.trim())) { setInvalid('Enter the due date as YYYY-MM-DD, or leave it empty.'); return }
    const saved = await action.run({ action: 'milestone', id: milestone?.id ?? null, title, description: details, status, dueDate: due.trim() || null, sortOrder: milestone?.sortOrder ?? 100, assigneeUserId: owner || null }, milestone ? 'Milestone saved.' : 'Milestone added.')
    if (saved) onDone()
  }
  return <View style={styles.form}>
    <Field label="Milestone" value={title} onChangeText={setTitle} maxLength={160} placeholder="Order parts, first prototype, test run..."/>
    <Choice label="Owner" options={[{ value: '', label: 'No owner yet' }, ...roster.map(person => ({ value: person.userId, label: person.displayName }))]} value={owner} onChange={setOwner}/>
    <Field label="Due date" hint="YYYY-MM-DD" value={due} onChangeText={setDue} placeholder="2026-01-31" keyboardType="numbers-and-punctuation" maxLength={10}/>
    <Choice label="Status" options={statuses} value={status} onChange={setStatus}/>
    <Field label="Details" hint="Optional" multiline maxLength={2000} value={details} onChangeText={setDetails}/>
    <Notice error={invalid || action.error}/>
    <Actions>
      <Button label={action.busy ? 'Saving...' : milestone ? 'Save milestone' : 'Add milestone'} busy={action.busy} onPress={() => void submit()}/>
      <Button label="Cancel" kind="secondary" onPress={onDone}/>
    </Actions>
  </View>
}

const styles = StyleSheet.create({
  list: { gap: 16, marginTop: 4 },
  item: { gap: 8, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  title: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  form: { gap: 12, paddingTop: 8 },
})
