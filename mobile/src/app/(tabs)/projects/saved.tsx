import { Linking } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Button, Card, ErrorState, Heading, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import type { SavedItem } from '@/components/projects/types'
import { API_URL } from '@/lib/config'
import { useApi } from '@/lib/useApi'

const typeLabel = { PROJECT: 'Project', OPPORTUNITY: 'Opportunity', RESOURCE: 'Resource' } as const

export default function Saved() {
  const { data, error, refreshing, reload } = useApi<{ items: SavedItem[] }>('/api/mobile/saved')
  const header = <Stack.Screen options={{ title: 'Saved' }}/>
  if (!data) return <>{header}{error ? <ErrorState error={error} onRetry={reload}/> : <Loading/>}</>
  const open = (item: SavedItem) => item.itemType === 'PROJECT' ? router.push(`/projects/${item.itemId}`) : void Linking.openURL(`${API_URL}${item.href}`)
  return <Screen refreshing={refreshing} onRefresh={reload}>
    {header}
    <Title>Saved</Title>
    <Muted>Projects, opportunities, and resources you want to come back to.</Muted>
    {data.items.length ? <Card>
      {data.items.map((item, index) => <Row key={`${item.itemType}:${item.itemId}`} title={item.title} detail={item.subtitle} meta={typeLabel[item.itemType]} onPress={() => open(item)} last={index === data.items.length - 1}/>)}
    </Card> : <>
      <Heading>Nothing saved yet.</Heading>
      <Muted>Browse public projects, opportunities, and resources and use Save to build your list.</Muted>
      <Button label="Find a project" icon="search" kind="secondary" onPress={() => router.push('/projects')}/>
    </>}
  </Screen>
}
