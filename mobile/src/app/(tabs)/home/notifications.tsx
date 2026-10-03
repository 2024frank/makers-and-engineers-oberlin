import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Empty, ErrorState, Heading, Loading, Muted, Notice, Screen } from '@/components/ui'
import { appRoute } from '@/components/home/portalRoute'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, text } from '@/lib/theme'
import { useApi } from '@/lib/useApi'

type Notification = { id: string; kind: string; title: string; body: string; actionUrl: string | null; readAt: string | null; createdAt: string }

export default function Notifications() {
  const { data, error, loading, refreshing, reload, setData } = useApi<{ notifications: Notification[] }>('/api/mobile/notifications')
  const { refresh } = useAuth()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  useEffect(() => { void refresh() }, [refresh])
  const onRefresh = useCallback(() => { void reload(); void refresh() }, [reload, refresh])

  const markLocal = (match: (row: Notification) => boolean) => setData(current => current && { notifications: current.notifications.map(row => match(row) ? { ...row, readAt: row.readAt ?? new Date().toISOString() } : row) })
  async function markAll() {
    setBusy(true); setProblem('')
    try { await api('/api/member/notifications', { method: 'PUT', body: { all: true } }); markLocal(() => true); void refresh() }
    catch (caught) { setProblem(errorMessage(caught)) }
    finally { setBusy(false) }
  }
  async function markOne(id: string) {
    setProblem('')
    try { await api('/api/member/notifications', { method: 'PUT', body: { notificationId: id } }); markLocal(row => row.id === id); void refresh() }
    catch (caught) { setProblem(errorMessage(caught)) }
  }
  function open(row: Notification, route: string) {
    if (!row.readAt) void markOne(row.id)
    router.push(route)
  }

  const header = <Stack.Screen options={{ title: 'Notifications' }}/>
  if (loading && !data) return <Screen>{header}<Loading/></Screen>
  if (!data) return <Screen refreshing={refreshing} onRefresh={onRefresh}>{header}<ErrorState error={error} onRetry={onRefresh}/></Screen>

  const rows = data.notifications
  const unread = rows.filter(row => !row.readAt).length
  return <Screen refreshing={refreshing} onRefresh={onRefresh}>
    {header}
    <Muted>Project invitations, application decisions, proposal reviews, and team-update reviews appear here.</Muted>
    <Heading>{`${unread} unread notification${unread === 1 ? '' : 's'}`}</Heading>
    {unread > 0 ? <Button label="Mark all read" kind="secondary" busy={busy} onPress={() => void markAll()}/> : null}
    <Notice error={problem}/>
    {error ? <Notice error={errorMessage(error)}/> : null}
    {rows.length ? rows.map(row => {
      const route = appRoute(row.actionUrl)
      return <Card key={row.id} style={row.readAt ? styles.read : styles.unread}>
        <Muted>{new Date(row.createdAt).toLocaleString()}</Muted>
        <Text style={[styles.title, row.readAt ? styles.titleRead : null]}>{row.title}</Text>
        <Body>{row.body}</Body>
        {route || !row.readAt ? <View style={styles.actions}>
          {route ? <View style={styles.action}><Button label="Open" kind={row.readAt ? 'secondary' : 'primary'} onPress={() => open(row, route)}/></View> : null}
          {!row.readAt ? <View style={styles.action}><Button label="Mark read" kind="secondary" onPress={() => void markOne(row.id)}/></View> : null}
        </View> : null}
      </Card>
    }) : <Empty>You do not have any notifications yet.</Empty>}
  </Screen>
}

const styles = StyleSheet.create({
  unread: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  read: { backgroundColor: colors.page },
  title: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  titleRead: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
})
