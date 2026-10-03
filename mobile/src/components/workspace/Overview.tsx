import { Linking, StyleSheet, Text, View } from 'react-native'
import { API_URL } from '@/lib/config'
import { Body, Button, Card, Heading, Muted, Title } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { ProgressBar } from './bits'
import { stageLabel, type Workspace } from './shared'

export function Overview({ workspace, isLead }: { workspace: Workspace; isLead: boolean }) {
  const { project, roster, milestones } = workspace
  const done = milestones.filter(m => m.status === 'DONE').length
  return <View style={styles.head}>
    <Muted>{`${stageLabel(project.status)} · ${isLead ? 'You lead this project' : 'Team member'}`}</Muted>
    <Title>{project.title}</Title>
    <Body>{project.summary || 'Private team coordination space.'}</Body>
    <Text style={styles.line}>{`${roster.length} on the team`}</Text>
    {milestones.length > 0 ? <>
      <Text style={styles.line}>{`${done} of ${milestones.length} milestones done`}</Text>
      <ProgressBar done={done} total={milestones.length}/>
    </> : null}
    {project.nextStep ? <Text style={styles.line}>{`Next step: ${project.nextStep}`}</Text> : null}
    {project.publicationState === 'published' ? <View style={styles.action}><Button label="Public project page" icon="open-outline" kind="secondary" onPress={() => void Linking.openURL(`${API_URL}/projects/${project.slug}`).catch(() => {})}/></View> : null}
  </View>
}

export function KickoffBanner({ kickoff }: { kickoff: NonNullable<Workspace['kickoff']> }) {
  let when = ''
  if (kickoff.meetingAt) {
    const date = new Date(kickoff.meetingAt)
    try { when = date.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
    catch { when = date.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
  }
  return <Card>
    <Heading>Your project has started</Heading>
    {kickoff.message ? <Body>{kickoff.message}</Body> : null}
    {when ? <Text style={styles.meta}>{`${when} (Eastern)`}</Text> : null}
    {kickoff.meetingLocation ? <Text style={styles.meta}>{kickoff.meetingLocation}</Text> : null}
  </Card>
}

const styles = StyleSheet.create({
  head: { gap: 6 },
  line: { fontSize: text.small, lineHeight: 20, color: colors.ink },
  meta: { fontSize: text.small, lineHeight: 20, color: colors.muted },
  action: { marginTop: 6, alignItems: 'flex-start' },
})
