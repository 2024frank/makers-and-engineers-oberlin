import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Field, Heading, Loading, Muted, Notice, Screen, Title } from '@/components/ui'
import { MilestoneMeter, ProjectImage, Roster, StatusLines, failure } from '@/components/projects/bits'
import type { ProjectResponse } from '@/components/projects/types'
import { api } from '@/lib/api'
import { useApi } from '@/lib/useApi'

const applyErrors = { APPLICATION_MOTIVATION_REQUIRED: 'Add a little more about why this project interests you.' }

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, error, refreshing, reload, setData } = useApi<ProjectResponse>(id ? `/api/mobile/projects/${encodeURIComponent(id)}` : null)
  const [saving, setSaving] = useState(false), [saveNote, setSaveNote] = useState('')
  const [applying, setApplying] = useState(false), [motivation, setMotivation] = useState(''), [skills, setSkills] = useState('')
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState(''), [sent, setSent] = useState(false)
  const header = <Stack.Screen options={{ title: data?.project.title ?? 'Project' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload} messages={{ PROJECT_NOT_FOUND: 'This project could not be found.' }}/> : <Loading/>}</>
  const { project, stats, roster, application, onTeam, canApply, saved } = data

  async function toggleSave() {
    if (saving) return
    setSaving(true); setSaveNote('')
    try {
      await api('/api/member/saves', { method: saved ? 'DELETE' : 'POST', body: { itemType: 'PROJECT', itemId: project.id } })
      setData(current => current && { ...current, saved: !saved })
      setSaveNote(saved ? 'Removed from saved items.' : 'Saved to your member account.')
    } catch (caught) { setSaveNote(''); setProblem(failure(caught, {}, 'Could not update saved item.')) }
    finally { setSaving(false) }
  }

  async function send() {
    if (busy || sent) return
    const text = motivation.trim()
    if (text.length < 10) { setProblem('Add a little more about why this project interests you.'); return }
    setBusy(true); setProblem('')
    try {
      await api('/api/member/project-applications', { method: 'POST', body: { projectId: project.id, motivation: text, skills: skills.split(',').map(value => value.trim()).filter(Boolean) } })
      setSent(true); setApplying(false)
      void reload()
    } catch (caught) { setProblem(failure(caught, applyErrors, 'Your application could not be sent. Please try again.')) }
    finally { setBusy(false) }
  }

  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <ProjectImage image={project.image}/>
    <StatusLines project={project} stats={stats} joined={onTeam}/>
    <Title>{project.title}</Title>
    {project.summary ? <Body>{project.summary}</Body> : null}
    {stats?.milestonesTotal ? <MilestoneMeter done={stats.milestonesDone} total={stats.milestonesTotal}/> : null}
    {project.disciplines.length > 0 ? <Muted>{project.disciplines.join(', ')}</Muted> : null}
    <Button label={saved ? 'Saved' : 'Save'} icon={saved ? 'bookmark' : 'bookmark-outline'} kind="secondary" busy={saving} onPress={() => void toggleSave()}/>
    <Notice message={saveNote}/>
    {!applying ? <Notice error={problem}/> : null}

    {sent ? <Card>
      <Heading>Application sent</Heading>
      <Body>The project lead for {project.title} will review your request.</Body>
      <Button label="View my applications" icon="arrow-forward" onPress={() => router.push('/projects/applications')}/>
    </Card> : onTeam ? <Button label="Open workspace" icon="arrow-forward" onPress={() => router.push(`/teams/${project.id}`)}/>
    : application?.status === 'PENDING' ? <Card>
      <Body>Application sent</Body>
      <Button label="View application" kind="secondary" icon="arrow-forward" onPress={() => router.push('/projects/applications')}/>
    </Card> : applying && canApply ? <Card>
      <Heading>Apply to {project.title}</Heading>
      <Field label="Why do you want to join?" value={motivation} onChangeText={setMotivation} multiline maxLength={3000}/>
      <Field label="Relevant skills" hint="Optional, separated by commas" placeholder="CAD, C++, prototyping" value={skills} onChangeText={setSkills} autoCapitalize="none"/>
      <Notice error={problem}/>
      <Muted>Sent to the project lead for review</Muted>
      <Button label={busy ? 'Sending...' : 'Send application'} icon="send" busy={busy} onPress={() => void send()}/>
      <Button label="Cancel" kind="secondary" disabled={busy} onPress={() => { setApplying(false); setProblem('') }}/>
    </Card> : canApply ? <Button label={application ? 'Apply again' : 'Apply to join'} icon="arrow-forward" onPress={() => setApplying(true)}/>
    : <Muted>Applications are closed for this project.</Muted>}

    {project.problem ? <><Heading>The problem</Heading><Body>{project.problem}</Body></> : null}
    {project.goal ? <><Heading>The goal</Heading><Body>{project.goal}</Body></> : null}
    {project.skills.length > 0 ? <Body><Body style={{ fontWeight: '700' }}>Skills:</Body> {project.skills.join(', ')}</Body> : null}
    <Heading>Who has joined ({roster.length})</Heading>
    {roster.length ? <Roster people={roster}/> : null}
  </Screen>
}
