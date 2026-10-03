import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Body, Button, Card, Choice, Field, Heading, Muted, Notice } from '@/components/ui'
import { failure } from './bits'
import { api } from '@/lib/api'
import { colors, text } from '@/lib/theme'

const steps = ['Your idea', 'Team & details', 'Review']
const initial = { title: '', summary: '', problem: '', goal: '', disciplines: '', recruitingNeeds: '', links: '' }
const headings = ['What would you like to build?', 'Who and what will you need?', 'Review your idea']
const lines = (value: string) => value.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
const commas = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

/** The three step "Propose an idea" form from the web portal. */
export function ProposalForm({ teams, initialTeamId, onSent, onClose }: { teams: { id: string; name: string }[]; initialTeamId: string; onSent: () => void; onClose: () => void }) {
  const [teamId, setTeamId] = useState(teams.some(team => team.id === initialTeamId) ? initialTeamId : '')
  const [step, setStep] = useState(0), [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false)
  const set = (name: keyof typeof initial) => (value: string) => setValues(previous => ({ ...previous, [name]: value }))

  async function next() {
    if (busy || sent) return
    setError('')
    if (step === 0 && (values.title.trim().length < 3 || values.problem.trim().length < 10 || values.goal.trim().length < 10)) { setError('Add a title, the problem, and what you want to accomplish.'); return }
    if (step === 1 && lines(values.links).some(link => !/^https?:\/\/\S+$/i.test(link))) { setError('Add valid supporting links starting with https:// or http://.'); return }
    if (step < 2) { setStep(step + 1); return }
    setBusy(true)
    try {
      await api('/api/member/project-proposals', { method: 'POST', body: { title: values.title, summary: values.summary, problem: values.problem, goal: values.goal, recruitingNeeds: values.recruitingNeeds, disciplines: commas(values.disciplines), links: lines(values.links), ...(teamId ? { teamId } : {}) } })
      setSent(true); onSent()
    } catch (caught) { setError(failure(caught, { PROJECT_LINK_INVALID: 'Check your supporting links and try again.' }, 'Your idea could not be sent. Your draft is still here. Please try again.')) }
    finally { setBusy(false) }
  }

  if (sent) return <Card>
    <Heading>Idea submitted</Heading>
    <Body>The club team will review {values.title}. Their decision and feedback will appear in My ideas.</Body>
    <Button label="View my ideas" icon="arrow-forward" onPress={onClose}/>
  </Card>

  const review = [['Team', teams.find(team => team.id === teamId)?.name ?? 'Individual proposal'], ['Project', values.title], ['Problem', values.problem], ['Goal', values.goal], ['Summary', values.summary], ['Disciplines', values.disciplines], ['Team needs', values.recruitingNeeds], ['Links', values.links]].filter(([, value]) => value)
  return <View style={styles.form}>
    <View style={styles.steps} accessibilityLabel={`Proposal progress, step ${step + 1} of 3`}>
      {steps.map((label, index) => <Text key={label} style={[styles.step, index === step && styles.stepOn]}>{index + 1} {label}</Text>)}
    </View>
    <Heading>{headings[step]}</Heading>
    {step === 0 ? <>
      <Field label="Project title" value={values.title} onChangeText={set('title')} maxLength={160}/>
      <Field label="What problem are you solving?" value={values.problem} onChangeText={set('problem')} multiline maxLength={3000}/>
      <Field label="What should the project accomplish?" value={values.goal} onChangeText={set('goal')} multiline maxLength={3000}/>
    </> : null}
    {step === 1 ? <>
      {teams.length > 0 ? <Choice label="Propose for" value={teamId} onChange={setTeamId} options={[{ value: '', label: 'My own idea' }, ...teams.map(team => ({ value: team.id, label: team.name }))]}/> : null}
      <Muted>These details are optional.</Muted>
      <Field label="Short summary" value={values.summary} onChangeText={set('summary')} multiline maxLength={700}/>
      <Field label="Engineering disciplines" hint="Separated by commas" placeholder="Electrical, Mechanical, Computer Science" value={values.disciplines} onChangeText={set('disciplines')}/>
      <Field label="Who or what skills do you want to recruit?" value={values.recruitingNeeds} onChangeText={set('recruitingNeeds')} multiline maxLength={1200}/>
      <Field label="Supporting links" hint="One URL per line" value={values.links} onChangeText={set('links')} multiline autoCapitalize="none" autoCorrect={false} keyboardType="url"/>
    </> : null}
    {step === 2 ? <Card>{review.map(([label, value]) => <View key={label}><Muted>{label}</Muted><Body>{value}</Body></View>)}</Card> : null}
    <Notice error={error}/>
    <Button label={busy ? 'Submitting...' : step === 0 ? 'Continue' : step === 1 ? 'Review idea' : 'Submit idea'} icon={step === 2 ? 'send' : 'arrow-forward'} busy={busy} onPress={() => void next()}/>
    <Button label={step > 0 ? 'Back' : 'Cancel'} kind="secondary" disabled={busy} onPress={() => { if (step > 0) { setError(''); setStep(step - 1) } else onClose() }}/>
  </View>
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  steps: { gap: 2 },
  step: { fontSize: text.small, color: colors.muted },
  stepOn: { color: colors.ink, fontWeight: '700' },
})
