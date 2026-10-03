import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Heading, Loading, Muted, Screen, Title } from '@/components/ui'
import { TeamBrowser, formatDueDate, isOverdue, progressLine, relativeTime, stageLabel, type ClubTeam, type ProjectOverview } from '@/components/teams/shared'
import { useApi } from '@/lib/useApi'
import { colors, text } from '@/lib/theme'

type Response = { projects: ProjectOverview[]; myTeams: ClubTeam[] }

function ProjectCard({ project }: { project: ProjectOverview }) {
  const percent = project.milestonesTotal ? Math.round(project.milestonesDone / project.milestonesTotal * 100) : 0
  const next = project.nextMilestone
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${project.title} workspace`} onPress={() => router.push(`/teams/${project.projectId}`)} style={({ pressed }) => pressed && styles.pressed}>
    <Card>
      <Heading>{project.title}</Heading>
      <Muted>{`${stageLabel(project.status)} · ${project.role === 'LEAD' ? 'You lead' : 'Team member'} · ${project.memberCount} on the team`}</Muted>
      <Body>{progressLine(project)}</Body>
      {project.milestonesTotal > 0 ? <View style={styles.bar}><View style={[styles.barFill, { width: `${percent}%` }]}/></View> : null}
      {next ? <Text style={[styles.small, isOverdue(next.dueDate, next.status) && styles.overdue]}>{`Next: ${next.title}${next.dueDate ? ` (due ${formatDueDate(next.dueDate)})` : ''}`}</Text> : null}
      {project.lastPostAt ? <Muted>{`Last team post ${relativeTime(project.lastPostAt)}`}</Muted> : null}
      <View style={styles.open}><Text style={styles.openText}>Open</Text></View>
    </Card>
  </Pressable>
}

export default function MyTeams() {
  const { data, error, loading, refreshing, reload } = useApi<Response>('/api/mobile/teams')
  return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: 'My teams' }}/>
    <Title>My teams</Title>
    <Muted>Your projects, how far along they are, and the teammates you work with.</Muted>
    <View style={styles.actions}>
      <View style={styles.flex}><Button label="Find a team" kind="secondary" icon="search" onPress={() => router.push('/teams/find')}/></View>
      <View style={styles.flex}><Button label="Create team" icon="add" onPress={() => router.push('/teams/new')}/></View>
    </View>
    {loading && !data ? <Loading/> : error && !data ? <ErrorState error={error} onRetry={reload}/> : data ? <>
      <Heading>My projects</Heading>
      {data.projects.length ? data.projects.map(project => <ProjectCard key={project.projectId} project={project}/>) : <>
        <Muted>Your projects appear here once you join a project team.</Muted>
        <Link href="/projects" style={styles.link}>Find a project</Link>
      </>}
      {data.myTeams.length > 0 ? <>
        <Heading>My club teams</Heading>
        <TeamBrowser teams={data.myTeams}/>
      </> : null}
    </> : null}
  </Screen>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12 },
  pressed: { opacity: 0.7 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.accent },
  small: { fontSize: text.small, lineHeight: 20, color: colors.ink },
  overdue: { color: colors.danger },
  open: { minHeight: 44, justifyContent: 'center' },
  openText: { fontSize: text.body, fontWeight: '600', color: colors.accent },
  link: { fontSize: text.body, fontWeight: '600', color: colors.accent, minHeight: 44, paddingVertical: 10 },
})
