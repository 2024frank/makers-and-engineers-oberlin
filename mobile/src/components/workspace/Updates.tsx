import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions } from './bits'
import { relativeTime, useWorkspaceAction, type Ctx, type TeamUpdate } from './shared'

const reviewLabels: Record<string, string> = { PENDING_REVIEW: 'Waiting for officer review', APPROVED_FOR_PUBLISH: 'Approved for the website', CHANGES_REQUESTED: 'Changes requested', REJECTED: 'Not published' }
const reviewColor = (status: string) => status === 'APPROVED_FOR_PUBLISH' ? colors.ok : status === 'CHANGES_REQUESTED' ? colors.warn : status === 'REJECTED' ? colors.danger : colors.muted
const DATE = /^\d{4}-\d{2}-\d{2}$/

export function WebsiteUpdates({ ctx, updates }: { ctx: Ctx; updates: TeamUpdate[] }) {
  const action = useWorkspaceAction(ctx)
  const [writing, setWriting] = useState(false), [revising, setRevising] = useState('')
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [summary, setSummary] = useState(''), [body, setBody] = useState(''), [milestone, setMilestone] = useState('')
  const [invalid, setInvalid] = useState('')
  async function submit() {
    setInvalid('')
    if (date.trim() && !DATE.test(date.trim())) { setInvalid('Enter the date as YYYY-MM-DD, or leave it empty.'); return }
    const sent = await action.call(`/api/member/projects/${ctx.projectId}/updates`, 'POST', { title, summary, body, milestone, updateDate: date.trim() }, 'Update sent to the officers for review. It is not public yet.')
    if (sent) { setTitle(''); setDate(''); setSummary(''); setBody(''); setMilestone(''); setWriting(false) }
  }
  return <Card>
    <Heading>Share progress on the website</Heading>
    <Muted>Post a public update for the project page. An officer reviews it before it goes live. For quick notes to your team, use the team feed.</Muted>
    {writing ? <View style={styles.form}>
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={180}/>
      <Field label="Date" hint="YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation"/>
      <Field label="Summary" hint="One or two sentences for the project page" multiline maxLength={700} value={summary} onChangeText={setSummary}/>
      <Field label="Full update" hint="Optional" multiline maxLength={8000} value={body} onChangeText={setBody}/>
      <Field label="Milestone label" hint="Optional" value={milestone} onChangeText={setMilestone} maxLength={180}/>
      <Notice error={invalid || action.error}/>
      <Actions>
        <Button label={action.busy ? 'Submitting...' : 'Send for review'} busy={action.busy} disabled={title.trim().length < 3} onPress={() => void submit()}/>
        <Button label="Cancel" kind="secondary" onPress={() => setWriting(false)}/>
      </Actions>
    </View> : <>
      <Notice message={action.message}/>
      <Actions><Button label="Write a website update" icon="create-outline" kind="secondary" onPress={() => { action.setMessage(''); setWriting(true) }}/></Actions>
    </>}
    <Heading>Submitted updates</Heading>
    {updates.length ? <View style={styles.feed}>{updates.map(update => <View key={update.id} style={styles.post}>
      <Text style={styles.title}>{update.title}</Text>
      <Text style={[styles.status, { color: update.publicationState === 'published' ? colors.ok : reviewColor(update.reviewStatus) }]}>{update.publicationState === 'published' ? 'Published' : reviewLabels[update.reviewStatus] ?? update.reviewStatus}</Text>
      <Muted>{relativeTime(update.submittedAt)}</Muted>
      {update.summary ? <Body>{update.summary}</Body> : null}
      {update.reviewFeedback ? <Body><Text style={styles.bold}>Officer note:</Text> {update.reviewFeedback}</Body> : null}
      {update.reviewStatus === 'CHANGES_REQUESTED' && (update.submittedBy === ctx.me || ctx.isLead) ? revising === update.id
        ? <ReviseUpdate ctx={ctx} update={update} onDone={() => setRevising('')}/>
        : <Actions><Button label="Revise and resubmit" kind="secondary" onPress={() => setRevising(update.id)}/></Actions> : null}
    </View>)}</View> : <Muted>No website updates submitted yet.</Muted>}
  </Card>
}

function ReviseUpdate({ ctx, update, onDone }: { ctx: Ctx; update: TeamUpdate; onDone: () => void }) {
  const action = useWorkspaceAction(ctx)
  const [title, setTitle] = useState(update.title), [summary, setSummary] = useState(update.summary), [body, setBody] = useState(update.body)
  const [milestone, setMilestone] = useState(update.milestone), [date, setDate] = useState(update.updateDate ?? '')
  const [invalid, setInvalid] = useState('')
  async function submit() {
    setInvalid('')
    if (date.trim() && !DATE.test(date.trim())) { setInvalid('Enter the date as YYYY-MM-DD, or leave it empty.'); return }
    if (await action.run({ action: 'resubmit-update', updateId: update.id, title, summary, body, milestone, updateDate: date.trim() || null }, 'Sent back for officer review.')) onDone()
  }
  return <View style={styles.form}>
    <Field label="Title" value={title} onChangeText={setTitle} maxLength={180}/>
    <Field label="Summary" multiline maxLength={700} value={summary} onChangeText={setSummary}/>
    <Field label="Full update" multiline maxLength={8000} value={body} onChangeText={setBody}/>
    <Field label="Milestone label" value={milestone} onChangeText={setMilestone} maxLength={180}/>
    <Field label="Date" hint="YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation"/>
    <Notice error={invalid || action.error}/>
    <Actions>
      <Button label={action.busy ? 'Sending...' : 'Resubmit for review'} busy={action.busy} onPress={() => void submit()}/>
      <Button label="Cancel" kind="secondary" onPress={onDone}/>
    </Actions>
  </View>
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  feed: { gap: 12 },
  post: { gap: 6, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  title: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  status: { fontSize: text.small, fontWeight: '600' },
  bold: { fontWeight: '700' },
})
