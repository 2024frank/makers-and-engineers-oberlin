import { router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { Text } from 'react-native'
import { Body, Button, Card, ErrorState, Heading, Loading, Muted, Screen, Title } from '@/components/ui'
import { statusColor } from '@/components/projects/bits'
import { ProposalForm } from '@/components/projects/ProposalForm'
import type { Proposal } from '@/components/projects/types'
import { useApi } from '@/lib/useApi'

const labels = { PENDING: 'Awaiting review', APPROVED: 'Approved', WITHDRAWN: 'Withdrawn', REJECTED: 'Not approved' } as const

export default function Proposals() {
  const params = useLocalSearchParams<{ new?: string; team?: string }>()
  const { data, error, refreshing, reload } = useApi<{ proposals: Proposal[]; teams: { id: string; name: string }[] }>('/api/mobile/proposals')
  const creating = params.new === '1'
  const header = <Stack.Screen options={{ title: creating ? 'Propose an idea' : 'My ideas' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload}/> : <Loading/>}</>
  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <Title>{creating ? 'Propose an idea' : 'My ideas'}</Title>
    <Muted>{creating ? 'A new project for the club to consider.' : 'Your proposals and the club team\'s feedback.'}</Muted>
    {creating ? <ProposalForm teams={data.teams} initialTeamId={typeof params.team === 'string' ? params.team : ''} onSent={() => void reload()} onClose={() => router.replace('/projects/proposals')}/> : <>
      <Button label="Propose an idea" icon="add" onPress={() => router.push('/projects/proposals?new=1')}/>
      {data.proposals.map(proposal => <Card key={proposal.id}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor(proposal.status) }}>{labels[proposal.status]}</Text>
        <Heading>{proposal.title}</Heading>
        <Body>{proposal.summary || proposal.problem}</Body>
        {proposal.adminFeedback ? <Body><Body style={{ fontWeight: '700' }}>Club feedback:</Body> {proposal.adminFeedback}</Body> : null}
        {proposal.approvedProjectId ? <Button label="Open my team" icon="arrow-forward" onPress={() => router.push(`/teams/${proposal.approvedProjectId}`)}/> : null}
      </Card>)}
      {!data.proposals.length ? <>
        <Heading>No ideas submitted yet</Heading>
        <Muted>Your proposals and review decisions will appear here.</Muted>
      </> : null}
    </>}
  </Screen>
}
