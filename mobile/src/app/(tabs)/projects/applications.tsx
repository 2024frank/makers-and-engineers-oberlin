import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, ErrorState, Heading, Loading, Muted, Notice, Screen, Title } from '@/components/ui'
import { applicationLabels, failure, statusColor } from '@/components/projects/bits'
import type { Application } from '@/components/projects/types'
import { api } from '@/lib/api'
import { useApi } from '@/lib/useApi'

export default function Applications() {
  const { data, error, refreshing, reload } = useApi<{ applications: Application[]; teamIds: string[] }>('/api/mobile/applications')
  const [busy, setBusy] = useState(''), [problem, setProblem] = useState('')
  const header = <Stack.Screen options={{ title: 'My applications' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload}/> : <Loading/>}</>

  function confirmWithdraw(application: Application) {
    Alert.alert('Withdraw application', `Withdraw your application to ${application.projectTitle}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw application', style: 'destructive', onPress: () => void withdraw(application) },
    ])
  }
  async function withdraw(application: Application) {
    setBusy(application.id); setProblem('')
    try { await api('/api/member/project-applications', { method: 'DELETE', body: { applicationId: application.id } }); await reload() }
    catch (caught) {
      setProblem(failure(caught, { OFFLINE: 'Could not reach the server. Please try again.' }, 'This application was already decided. Pull down to refresh and see where it stands.'))
      void reload()
    }
    finally { setBusy('') }
  }

  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <Title>My applications</Title>
    <Muted>Your project applications and the decisions on them.</Muted>
    <Button label="Find a project" icon="search" kind="secondary" onPress={() => router.push('/projects')}/>
    <Notice error={problem}/>
    {data.applications.map(application => <Card key={application.id}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor(application.status) }}>{applicationLabels[application.status]}</Text>
      <Heading>{application.projectTitle}</Heading>
      <Body>{application.motivation}</Body>
      {application.decisionNote ? <Body><Body style={{ fontWeight: '700' }}>Note:</Body> {application.decisionNote}</Body> : null}
      {application.status === 'PENDING' ? <Button label={busy === application.id ? 'Withdrawing...' : 'Withdraw application'} kind="secondary" busy={busy === application.id} disabled={Boolean(busy)} onPress={() => confirmWithdraw(application)}/> : null}
      {application.status === 'ACCEPTED' && data.teamIds.includes(application.projectId) ? <Button label="Open my team" icon="arrow-forward" onPress={() => router.push(`/teams/${application.projectId}`)}/> : null}
    </Card>)}
    {!data.applications.length ? <>
      <Heading>No applications yet</Heading>
      <Muted>Choose a project that is looking for teammates.</Muted>
      <Button label="Browse projects" icon="arrow-forward" onPress={() => router.push('/projects')}/>
    </> : null}
  </Screen>
}
