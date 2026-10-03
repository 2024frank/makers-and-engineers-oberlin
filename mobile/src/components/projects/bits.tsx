import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { ApiError, errorMessage } from '@/lib/api'
import { API_URL } from '@/lib/config'
import { colors, text } from '@/lib/theme'
import type { Person, Project, TeamStats } from './types'

const absolute = (url: string) => /^https?:\/\//i.test(url) ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`

export function ProjectImage({ image }: { image: Project['image'] }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) return null
  return <Image source={{ uri: absolute(image.url) }} accessibilityLabel={image.alt || undefined} contentFit="cover" onError={() => setFailed(true)} style={styles.image}/>
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}

/** The status lines the web project card shows above the title. */
export function StatusLines({ project, stats, joined }: { project: Pick<Project, 'recruiting'>; stats?: TeamStats | null; joined: boolean }) {
  return <View style={styles.lines}>
    <Text style={[styles.status, project.recruiting && styles.statusOk]}>{project.recruiting ? 'Recruiting members' : 'Not recruiting'}</Text>
    {stats?.startedAt ? <Text style={styles.status}>Underway since {formatDate(stats.startedAt)}</Text> : null}
    {joined ? <Text style={[styles.status, styles.statusOk]}>You are on this team</Text> : null}
  </View>
}

/** One segment per milestone, as on the web build meter. */
export function MilestoneMeter({ done, total }: { done: number; total: number }) {
  if (!total) return null
  const label = done >= total ? `All ${total} milestones done` : `${done} of ${total} milestones done`
  return <View style={styles.meter} accessibilityLabel={label}>
    <View style={styles.track}>
      {total <= 24 ? Array.from({ length: total }, (_, index) => <View key={index} style={[styles.seg, index < done ? styles.segDone : styles.segTodo]}/>)
        : <>{done > 0 ? <View style={[styles.seg, styles.segDone, { flexGrow: done }]}/> : null}{done < total ? <View style={[styles.seg, styles.segTodo, { flexGrow: total - done }]}/> : null}</>}
    </View>
    <Text style={styles.status} importantForAccessibility="no">{label}</Text>
  </View>
}

export function Roster({ people }: { people: Person[] }) {
  return <View style={styles.roster}>{people.map((person, index) => <View key={person.userId ?? `private-${index}`} style={styles.person}>
    <View style={styles.avatar}><Text style={styles.avatarText}>{person.displayName.slice(0, 1)}</Text></View>
    <View style={styles.personText}><Text style={styles.personName}>{person.displayName}</Text><Text style={styles.personRole}>{person.role === 'LEAD' ? 'Lead' : 'Member'}</Text></View>
  </View>)}</View>
}

/** An error sentence: the screen's own mapping, the shared connection sentences, then a fallback. */
export function failure(error: unknown, map: Record<string, string>, fallback: string) {
  if (error instanceof ApiError && map[error.code]) return map[error.code]
  if (error instanceof ApiError && (error.status === 0 || error.status === 401)) return errorMessage(error)
  return fallback
}

export const applicationLabels = { PENDING: 'Awaiting a decision', ACCEPTED: 'Accepted', REJECTED: 'Not accepted', WITHDRAWN: 'Withdrawn' } as const
export const statusColor = (status: string) => status === 'ACCEPTED' || status === 'APPROVED' ? colors.ok : status === 'REJECTED' ? colors.danger : status === 'PENDING' ? colors.warn : colors.muted

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: colors.line },
  lines: { gap: 2 },
  status: { fontSize: text.tiny, fontWeight: '600', color: colors.muted },
  statusOk: { color: colors.ok },
  meter: { gap: 6 },
  track: { flexDirection: 'row', gap: 3, height: 8 },
  seg: { flex: 1, borderRadius: 2 },
  segDone: { backgroundColor: colors.ok },
  segTodo: { backgroundColor: colors.line },
  roster: { gap: 4 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: text.small, fontWeight: '700', color: colors.accent },
  personText: { flex: 1 },
  personName: { fontSize: text.body, color: colors.ink },
  personRole: { fontSize: text.tiny, color: colors.muted },
})
