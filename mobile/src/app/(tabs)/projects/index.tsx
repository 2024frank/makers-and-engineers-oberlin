import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Choice, ErrorState, Field, Heading, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import { MilestoneMeter, ProjectImage, StatusLines } from '@/components/projects/bits'
import type { ProjectsResponse } from '@/components/projects/types'
import { useApi } from '@/lib/useApi'
import { colors } from '@/lib/theme'

export default function Projects() {
  const { data, error, refreshing, reload } = useApi<ProjectsResponse>('/api/mobile/projects')
  const [query, setQuery] = useState(''), [recruiting, setRecruiting] = useState<'all' | 'recruiting'>('all')
  const visible = useMemo(() => (data?.projects ?? []).filter(project => (recruiting === 'all' || project.recruiting) && [project.title, project.summary, ...project.disciplines, ...project.skills].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [data, query, recruiting])
  const header = <Stack.Screen options={{ title: 'Projects' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload}/> : <Loading/>}</>
  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <Title>Find a project</Title>
    <Muted>Explore what the club is building and see who has joined.</Muted>
    <Button label="Propose an idea" icon="bulb-outline" kind="secondary" onPress={() => router.push('/projects/proposals?new=1')}/>
    <Card>
      <Row title="Saved" icon="bookmark-outline" onPress={() => router.push('/projects/saved')}/>
      <Row title="My applications" icon="paper-plane-outline" onPress={() => router.push('/projects/applications')}/>
      <Row title="Invitations" icon="mail-outline" onPress={() => router.push('/projects/invitations')}/>
      <Row title="My ideas" icon="bulb-outline" onPress={() => router.push('/projects/proposals')} last/>
    </Card>
    <Field label="Search projects" placeholder="Search projects or skills" value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing"/>
    <Choice value={recruiting} onChange={setRecruiting} options={[{ value: 'all', label: 'All projects' }, { value: 'recruiting', label: 'Recruiting members' }]}/>
    <Muted>{visible.length} project{visible.length === 1 ? '' : 's'}</Muted>
    {visible.map(project => {
      const found = data.applications.find(item => item.projectId === project.id)
      const stats = data.stats[project.id]
      const joined = data.teamIds.includes(project.id)
      const members = data.rosters.find(roster => roster.projectId === project.id)?.members.length ?? 0
      return <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={project.title} onPress={() => router.push(`/projects/${project.id}`)} style={({ pressed }) => pressed && styles.pressed}>
        <Card>
          <ProjectImage image={project.image}/>
          <StatusLines project={project} stats={stats} joined={joined}/>
          <Heading>{project.title}</Heading>
          {project.summary ? <Body>{project.summary}</Body> : null}
          {stats?.milestonesTotal ? <MilestoneMeter done={stats.milestonesDone} total={stats.milestonesTotal}/> : null}
          <Muted>Who has joined ({members})</Muted>
          {project.disciplines.length > 0 ? <Muted>{project.disciplines.join(', ')}</Muted> : null}
          <Text style={styles.state}>{joined ? 'Open workspace' : found?.status === 'PENDING' ? 'Application sent' : project.recruiting ? found ? 'Apply again' : 'Apply to join' : 'Applications are closed for this project.'}</Text>
        </Card>
      </Pressable>
    })}
    {!visible.length ? <View style={styles.empty}>
      <Heading>{data.projects.length ? 'No matching projects.' : 'No projects published yet.'}</Heading>
      {data.projects.length ? <Button label="Clear filters" kind="secondary" onPress={() => { setQuery(''); setRecruiting('all') }}/> : <Button label="Propose an idea" onPress={() => router.push('/projects/proposals?new=1')}/>}
    </View> : null}
  </Screen>
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  state: { fontSize: 14, fontWeight: '600', color: colors.accent },
  empty: { gap: 12, paddingVertical: 12 },
})
