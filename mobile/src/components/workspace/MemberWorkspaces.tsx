import { useMemo, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '@/lib/api'
import { Body, Button, Card, Choice, Field, Heading, Muted, Notice } from '@/components/ui'
import { colors, text } from '@/lib/theme'
import { Actions, confirmAction } from './bits'
import { relativeTime, workspaceError, workspaceErrorMessage, type Ctx, type RosterPerson, type WorkLog } from './shared'

const MAX_PHOTOS = 6
const MAX_TOTAL_BYTES = 4 * 1024 * 1024
const THUMB = 96
type Draft = { id: string; uri: string; size: number }

/** Shrink a phone photo to at most 1400px on the long side as a JPEG, so uploads stay small on mobile data. */
async function shrinkPhoto(asset: ImagePicker.ImagePickerAsset): Promise<Draft> {
  let { width, height } = asset
  let source: string | ImageRef = asset.uri
  if (!width || !height) { const full = await ImageManipulator.manipulate(asset.uri).renderAsync(); width = full.width; height = full.height; source = full }
  const context = ImageManipulator.manipulate(source)
  if (Math.max(width, height) > 1400) context.resize(width >= height ? { width: 1400 } : { height: 1400 })
  const saved = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.76 })
  const size = await fetch(saved.uri).then(response => response.blob()).then(blob => blob.size).catch(() => 0)
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uri: saved.uri, size }
}

export function MemberWorkspaces({ ctx, logs, roster, started }: { ctx: Ctx; logs: WorkLog[]; roster: RosterPerson[]; started: boolean }) {
  const { projectId, me, isLead } = ctx
  const people = useMemo(() => {
    const onTeam = roster.map(person => ({ userId: person.userId, name: person.userId === me ? 'My workspace' : person.displayName }))
    const known = new Set(onTeam.map(person => person.userId))
    const former = logs.filter(log => !known.has(log.authorUserId)).map(log => ({ userId: log.authorUserId, name: log.authorName }))
    const unique = [...new Map([...onTeam, ...former].map(person => [person.userId, person])).values()]
    return unique.sort((a, b) => Number(b.userId === me) - Number(a.userId === me))
  }, [roster, logs, me])
  const [selected, setSelected] = useState(people.some(person => person.userId === me) ? me : people[0]?.userId ?? me)
  const [body, setBody] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busy, setBusy] = useState(false), [processing, setProcessing] = useState(0)
  const [error, setError] = useState(''), [message, setMessage] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const refreshedAt = useRef(0)

  const mine = selected === me
  const onRoster = roster.some(person => person.userId === me)
  const entries = logs.filter(log => log.authorUserId === selected)
  const selectedName = people.find(person => person.userId === selected)?.name ?? ''

  async function pick(source: 'camera' | 'library') {
    if (busy) return
    setError(''); setMessage('')
    const room = MAX_PHOTOS - drafts.length
    if (room <= 0) { setError(workspaceErrorMessage('WORK_LOG_TOO_MANY_PHOTOS')); return }
    let result: ImagePicker.ImagePickerResult
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) { setError('Camera access is turned off. Allow the camera for this app in your phone settings to take photos.'); return }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, orderedSelection: true, quality: 1 })
      }
    } catch { setError(source === 'camera' ? 'The camera could not be opened. Check that camera access is allowed for this app in your phone settings.' : 'Your photos could not be opened. Check that photo access is allowed for this app in your phone settings.'); return }
    if (result.canceled || !result.assets.length) return
    setProcessing(count => count + 1)
    try {
      const assets = result.assets.slice(0, room)
      const shrunk = await Promise.all(assets.map(shrinkPhoto))
      if (result.assets.length > room) setError(workspaceErrorMessage('WORK_LOG_TOO_MANY_PHOTOS'))
      setDrafts(current => [...current, ...shrunk].slice(0, MAX_PHOTOS))
    } catch { setError(workspaceErrorMessage('WORK_LOG_PHOTO_INVALID')) }
    finally { setProcessing(count => count - 1) }
  }
  async function submit() {
    if (busy || processing) return
    if (body.trim().length < 2 && !drafts.length) { setError(workspaceErrorMessage('WORK_LOG_REQUIRED')); return }
    if (drafts.reduce((total, draft) => total + draft.size, 0) > MAX_TOTAL_BYTES) { setError(workspaceErrorMessage('WORK_LOG_UPLOAD_TOO_LARGE')); return }
    const form = new FormData()
    form.append('body', body)
    drafts.forEach(draft => form.append('photos', { uri: draft.uri, name: 'photo.jpg', type: 'image/jpeg' } as any))
    setBusy(true); setError(''); setMessage('')
    try {
      await api(`/api/member/projects/${projectId}/worklog`, { method: 'POST', form })
      setDrafts([]); setBody(''); setMessage('Saved to your workspace.')
      await ctx.reload()
    } catch (caught) { setError(workspaceError(caught)) }
    finally { setBusy(false) }
  }
  function remove(id: string) {
    confirmAction('Delete this entry and its photos?', 'Delete', async () => {
      setBusy(true); setError(''); setMessage('')
      try { await api(`/api/member/projects/${projectId}/worklog?id=${id}`, { method: 'DELETE' }); setMessage('Entry deleted.'); await ctx.reload() }
      catch (caught) { setError(workspaceError(caught)) }
      finally { setBusy(false) }
    })
  }
  // Signed photo links last an hour. If one fails on a screen left open, load fresh links.
  function refreshPhotos() {
    if (Date.now() - refreshedAt.current < 60_000) return
    refreshedAt.current = Date.now(); void ctx.reload()
  }

  if (!started) return <Card>
    <Heading>Workspaces</Heading>
    <Muted>Each teammate gets a workspace for progress notes and photos once a club officer starts this project.</Muted>
  </Card>

  return <Card>
    <Heading>Workspaces</Heading>
    <Muted>Only your team and club officers see this</Muted>
    <Choice label="Team workspaces" options={people.map(person => ({ value: person.userId, label: person.name }))} value={selected} onChange={value => { setSelected(value); setError(''); setMessage('') }}/>
    {onRoster && mine ? <View style={styles.form}>
      <Field label="Progress note" multiline maxLength={4000} value={body} onChangeText={setBody} placeholder="What did you build, test or learn, and what is next?"/>
      {drafts.length > 0 ? <View style={styles.photos}>{drafts.map((draft, index) => <View key={draft.id} style={styles.thumb}>
        <Image source={{ uri: draft.uri }} style={styles.thumbImage} contentFit="cover" accessibilityLabel={`Photo ${index + 1} to upload`}/>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => setDrafts(current => current.filter(item => item.id !== draft.id))} style={styles.remove}>
          <View style={styles.removeIcon}><Ionicons name="close" size={16} color="#ffffff"/></View>
        </Pressable>
      </View>)}</View> : null}
      <Notice error={error} message={message}/>
      <Actions>
        <Button label="Take photo" icon="camera-outline" kind="secondary" disabled={busy || drafts.length >= MAX_PHOTOS} onPress={() => void pick('camera')}/>
        <Button label="Add photos" icon="images-outline" kind="secondary" disabled={busy || drafts.length >= MAX_PHOTOS} onPress={() => void pick('library')}/>
        <Button label={busy ? 'Saving...' : processing ? 'Preparing photos...' : 'Save entry'} icon="save-outline" busy={busy} disabled={processing > 0} onPress={() => void submit()}/>
      </Actions>
    </View> : <Notice error={error} message={message}/>}
    {entries.length ? <View style={styles.feed}>{entries.map(entry => <View key={entry.id} style={styles.post}>
      <View style={styles.postHead}><Text style={styles.author}>{entry.authorUserId === me ? 'You' : entry.authorName}</Text><Text style={styles.time}>{relativeTime(entry.createdAt)}</Text></View>
      {entry.body ? <Body>{entry.body}</Body> : null}
      {entry.photos.length > 0 ? <View style={styles.photos}>{entry.photos.map((photo, index) => <Pressable key={photo.path} accessibilityRole="button" accessibilityLabel={`Open photo ${index + 1} of ${entry.photos.length}`} onPress={() => setViewing(photo.url)}>
        <Image source={{ uri: photo.url }} style={styles.thumbImage} contentFit="cover" onError={refreshPhotos} accessibilityLabel={`Progress photo ${index + 1} from ${entry.authorName}`}/>
      </Pressable>)}</View> : null}
      {entry.authorUserId === me || isLead ? <Actions><Button label="Delete" icon="trash-outline" kind="danger" disabled={busy} onPress={() => remove(entry.id)}/></Actions> : null}
    </View>)}</View> : <Muted>{mine ? 'Nothing here yet. Add a note or a photo each time you work on the project.' : `${selectedName} has not added anything yet.`}</Muted>}
    <Lightbox uri={viewing} onClose={() => setViewing(null)} onError={refreshPhotos}/>
  </Card>
}

function Lightbox({ uri, onClose, onError }: { uri: string | null; onClose: () => void; onError: () => void }) {
  const insets = useSafeAreaInsets()
  return <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
    <View style={styles.lightbox}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close photo" style={StyleSheet.absoluteFill} onPress={onClose}/>
      {uri ? <Image source={{ uri }} style={styles.full} contentFit="contain" onError={onError} accessibilityLabel="Progress photo, full size"/> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[styles.close, { top: insets.top + 8 }]}>
        <Ionicons name="close" size={24} color="#ffffff"/>
      </Pressable>
    </View>
  </Modal>
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: THUMB, height: THUMB },
  thumbImage: { width: THUMB, height: THUMB, borderRadius: 10, backgroundColor: '#e8ece9' },
  remove: { position: 'absolute', top: 0, right: 0, width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 4 },
  removeIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  feed: { gap: 12, marginTop: 4 },
  post: { gap: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  postHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  author: { fontSize: text.body, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  time: { fontSize: text.small, color: colors.muted },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  close: { position: 'absolute', right: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
})
