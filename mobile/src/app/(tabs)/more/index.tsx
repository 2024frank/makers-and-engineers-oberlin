import { useState } from 'react'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Heading, Muted, Row, Screen } from '@/components/ui'
import { useAuth, useMember } from '@/lib/auth'

const items = [
  { title: 'My profile', icon: 'person-outline', href: '/more/profile' },
  { title: 'Officer openings', icon: 'ribbon-outline', href: '/more/leadership' },
  { title: 'Notifications', icon: 'notifications-outline', href: '/home/notifications' },
  { title: 'Saved items', icon: 'bookmark-outline', href: '/projects/saved' },
  { title: 'My applications', icon: 'document-text-outline', href: '/projects/applications' },
  { title: 'Invitations', icon: 'mail-outline', href: '/projects/invitations' },
  { title: 'My ideas', icon: 'bulb-outline', href: '/projects/proposals' },
  { title: 'Find a team', icon: 'people-outline', href: '/teams/find' },
] as const

export default function More() {
  const member = useMember()
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  return <Screen>
    <Stack.Screen options={{ title: 'More' }}/>
    <Card>{items.map((item, index) => <Row key={item.href} icon={item.icon} title={item.title} last={index === items.length - 1} onPress={() => router.push(item.href)}/>)}</Card>
    <Card>
      <Heading>Signed in</Heading>
      <Body>{member.displayName}</Body>
      <Muted>{member.email}</Muted>
      <Button label="Sign out" kind="secondary" icon="log-out-outline" busy={busy} onPress={() => { setBusy(true); void signOut().finally(() => setBusy(false)) }}/>
    </Card>
  </Screen>
}
