import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Empty, ErrorState, Field, Heading, Loading, Muted, Notice, Screen } from '@/components/ui'
import { TextLink } from '@/components/home/parts'
import { formatDateTime } from '@/components/home/format'
import { api, ApiError, errorMessage } from '@/lib/api'
import { colors, text } from '@/lib/theme'
import { useApi } from '@/lib/useApi'

type Position = { id: string; roleTitle: string; term: string; bio: string; closesAt: string | null }
type Status = 'PENDING' | 'SHORTLISTED' | 'NOT_SELECTED' | 'WITHDRAWN'
type Application = { positionId: string; roleTitle: string; term: string; statement: string; experience: string; status: Status; feedback: string; submittedAt: string; reviewedAt: string | null }
type Leadership = { positions: Position[]; applications: Application[] }

const statusLabels: Record<Status, string> = { PENDING: 'Pending', SHORTLISTED: 'Shortlisted', NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn' }
const statusColors: Record<Status, string> = { PENDING: colors.warn, SHORTLISTED: colors.ok, NOT_SELECTED: colors.muted, WITHDRAWN: colors.muted }
const saveFailed = 'Your changes could not be saved. Please try again.'

const isOpen = (position: Position) => position.closesAt === null || new Date(position.closesAt).getTime() > Date.now()
const canEditApplication = (application?: Application) => !application || (application.reviewedAt === null && (application.status === 'PENDING' || application.status === 'WITHDRAWN'))
// The server answers with a sentence in `error`, which api() carries as the code.
const serverSentence = (caught: unknown) => caught instanceof ApiError && caught.status >= 400 && caught.code.includes(' ') ? caught.code : caught instanceof ApiError && caught.status === 0 ? errorMessage(caught) : saveFailed

function useLeadershipAction(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(payload: Record<string, string>) {
    if (busy) return false
    setBusy(true); setError('')
    try { await api('/api/member/leadership', { method: 'POST', body: payload }); onDone(); return true }
    catch (caught) { setError(serverSentence(caught)); return false }
    finally { setBusy(false) }
  }
  return { run, busy, error, setError }
}

function ApplicationForm({ position, application, onDone, onList }: { position: Position; application?: Application; onDone: () => void; onList: () => void }) {
  const [statement, setStatement] = useState(application?.statement ?? '')
  const [experience, setExperience] = useState(application?.experience ?? '')
  const [validation, setValidation] = useState('')
  const [saved, setSaved] = useState<'applied' | 'withdrawn' | null>(null)
  const { run, busy, error } = useLeadershipAction(onDone)

  async function submit() {
    if (busy || saved) return
    if (!isOpen(position)) { setValidation('This position is no longer accepting applications.'); return }
    if (statement.trim().length < 20 || statement.length > 3000) { setValidation('Your statement must be between 20 and 3,000 characters.'); return }
    if (experience.length > 2000) { setValidation('Relevant experience must be 2,000 characters or fewer.'); return }
    setValidation('')
    if (await run({ action: 'apply', positionId: position.id, statement: statement.trim(), experience: experience.trim() })) setSaved('applied')
  }

  if (saved) return <>
    <Notice message={saved === 'withdrawn' ? 'Application withdrawn.' : 'Application saved.'}/>
    <TextLink label="My applications" onPress={onList}/>
  </>
  return <>
    <Field label="Statement of interest" multiline maxLength={3000} value={statement} onChangeText={setStatement} style={styles.tall}/>
    <Field label="Relevant experience" multiline maxLength={2000} value={experience} onChangeText={setExperience}/>
    <Notice error={validation || error}/>
    <Button label={application?.status === 'WITHDRAWN' ? 'Resubmit application' : application ? 'Save changes' : 'Submit application'} icon="send" busy={busy} onPress={() => void submit()}/>
    {application?.status === 'PENDING' ? <Button label="Withdraw application" kind="secondary" icon="arrow-undo-outline" disabled={busy} onPress={async () => { setValidation(''); if (await run({ action: 'withdraw', positionId: position.id })) setSaved('withdrawn') }}/> : null}
  </>
}

function MemberApplication({ application, open, editing, onDone, onEdit }: { application: Application; open: boolean; editing: boolean; onDone: () => void; onEdit: () => void }) {
  const [withdrawn, setWithdrawn] = useState(false)
  const { run, busy, error } = useLeadershipAction(onDone)
  const status = withdrawn ? 'WITHDRAWN' : application.status
  const canWithdraw = !editing && (status === 'PENDING' || status === 'SHORTLISTED')
  const canEdit = !editing && open && application.reviewedAt === null && (status === 'PENDING' || status === 'WITHDRAWN')
  return <Card>
    <Heading>{application.roleTitle}</Heading>
    <Muted>{application.term}</Muted>
    <Text style={[styles.status, { color: statusColors[status] }]}>{statusLabels[status]}</Text>
    <Muted>{`Submitted ${formatDateTime(application.submittedAt)}`}</Muted>
    <Text style={styles.sub}>Statement of interest</Text><Body>{application.statement}</Body>
    {application.experience ? <><Text style={styles.sub}>Relevant experience</Text><Body>{application.experience}</Body></> : null}
    {application.feedback ? <View style={styles.feedback}>
      <Text style={styles.sub}>Feedback</Text><Body>{application.feedback}</Body>
      {application.reviewedAt ? <Muted>{`Reviewed ${formatDateTime(application.reviewedAt)}`}</Muted> : null}
    </View> : null}
    {canEdit && !busy ? <Button label={status === 'WITHDRAWN' ? 'Resubmit application' : 'Edit application'} kind="secondary" onPress={onEdit}/> : null}
    {canWithdraw ? <Button label={busy ? 'Withdrawing...' : 'Withdraw application'} kind="secondary" icon="arrow-undo-outline" disabled={busy} onPress={async () => { if (await run({ action: 'withdraw', positionId: application.positionId })) setWithdrawn(true) }}/> : null}
    <Notice error={error} message={withdrawn ? 'Application withdrawn.' : undefined}/>
  </Card>
}

export default function LeadershipScreen() {
  const params = useLocalSearchParams<{ position?: string }>()
  const positionId = params.position || undefined
  const { data, error, loading, refreshing, reload } = useApi<Leadership>('/api/mobile/leadership')
  const toList = () => router.setParams({ position: undefined })
  const toPosition = (id: string) => router.setParams({ position: id })

  const header = <Stack.Screen options={{ title: 'Officer openings' }}/>
  if (loading && !data) return <Screen>{header}<Loading/></Screen>
  if (!data) return <Screen refreshing={refreshing} onRefresh={reload}>{header}<ErrorState error={error} onRetry={reload}/></Screen>

  const { positions, applications } = data
  const openPositions = positions.filter(isOpen)
  const selected = openPositions.find(position => position.id === positionId)
  const existing = applications.find(application => application.positionId === positionId)
  const canEdit = Boolean(selected && canEditApplication(existing))
  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    {positionId ? <TextLink label="All open positions" onPress={toList}/> : null}
    {positionId && !selected ? <Notice error="This position is no longer accepting applications."/> : null}
    {selected ? <Card>
      <Heading>{existing ? `Application for ${selected.roleTitle}` : `Apply for ${selected.roleTitle}`}</Heading>
      <Muted>{selected.term}</Muted>
      <Body>{selected.bio}</Body>
      {selected.closesAt ? <Text style={styles.deadline}>{`Apply by ${formatDateTime(selected.closesAt)}`}</Text> : null}
      {canEdit ? <ApplicationForm key={`${selected.id}:${existing?.status ?? 'new'}:${existing?.submittedAt ?? ''}`} position={selected} application={existing} onDone={() => {}} onList={() => { void reload(); toList() }}/> : null}
    </Card> : null}
    {!positionId ? (openPositions.length ? openPositions.map(position => <Card key={position.id}>
      <Heading>{position.roleTitle}</Heading>
      <Muted>{position.term}</Muted>
      <Body>{position.bio}</Body>
      {position.closesAt ? <Text style={styles.deadline}>{`Apply by ${formatDateTime(position.closesAt)}`}</Text> : null}
      <Button label="Apply" icon="arrow-forward" kind="secondary" onPress={() => toPosition(position.id)}/>
    </Card>) : <Empty>No open positions right now.</Empty>) : null}
    <Heading>My applications</Heading>
    {applications.length ? applications.map(application => <MemberApplication key={`${application.positionId}:${application.status}:${application.submittedAt}`} application={application} open={openPositions.some(position => position.id === application.positionId)} editing={canEdit && application.positionId === positionId} onDone={() => void reload()} onEdit={() => toPosition(application.positionId)}/>) : <Empty>No officer applications yet.</Empty>}
  </Screen>
}

const styles = StyleSheet.create({
  tall: { minHeight: 160 },
  status: { fontSize: text.small, fontWeight: '700' },
  sub: { fontSize: text.small, fontWeight: '700', color: colors.ink, marginTop: 4 },
  deadline: { fontSize: text.small, fontWeight: '600', color: colors.ink },
  feedback: { borderLeftWidth: 3, borderLeftColor: '#9fb7a7', paddingLeft: 12, gap: 4, marginTop: 6 },
})
