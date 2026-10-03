import { View } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Button, ErrorState, Loading, Muted, Screen, Title } from '@/components/ui'
import { TeamBrowser, type ClubTeam } from '@/components/teams/shared'
import { useApi } from '@/lib/useApi'

export default function FindTeam() {
  const { data, error, loading, refreshing, reload } = useApi<{ teams: ClubTeam[] }>('/api/mobile/teams/find')
  return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: 'Find a team' }}/>
    <Title>Find a team</Title>
    <Muted>See who is working together and where you can help.</Muted>
    <View><Button label="Create team" icon="add" onPress={() => router.push('/teams/new')}/></View>
    {loading && !data ? <Loading/> : error && !data ? <ErrorState error={error} onRetry={reload}/> : data ? <TeamBrowser teams={data.teams}/> : null}
  </Screen>
}
