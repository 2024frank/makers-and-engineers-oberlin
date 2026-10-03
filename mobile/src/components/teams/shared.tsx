import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import { ApiError, api, errorMessage } from '@/lib/api'
import { colors, text } from '@/lib/theme'
import { Body, Button, Card, Empty, Field, Heading, Muted } from '@/components/ui'

export type TeamPerson = { userId: string | null; displayName: string; role: 'LEAD' | 'MEMBER' }
export type TeamProject = { id: string; title: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; published: boolean; canReview: boolean; canAccess?: boolean }
export type ClubTeam = {
  id: string; name: string; description: string; recruiting: boolean
  myRole: 'LEAD' | 'MEMBER' | null
  myRequest: { direction: 'INVITE' | 'JOIN'; status: string } | null
  roster: TeamPerson[]
  projects: TeamProject[]
  proposals: { id: string; title: string; status: string; feedback: string | null }[]
  requests: { userId: string; displayName: string; direction: 'INVITE' | 'JOIN'; message: string; status: string }[]
}
export type ProjectOverview = { projectId: string; title: string; role: 'LEAD' | 'MEMBER'; status: string; startedAt: string | null; memberCount: number; milestonesTotal: number; milestonesDone: number; myOpenMilestones: number; nextMilestone: { title: string; dueDate: string | null; status: string } | null; lastPostAt: string | null }
export type DirectoryMember = {
  userId: string; displayName?: string; classYear?: number; major?: string; disciplines?: string[]; skills?: string[]; projectInterests?: string[]
  availability?: string; portfolioUrl?: string; githubUrl?: string; linkedinUrl?: string; contactEmail?: string
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** The write route answers with a sentence in `error`. Show it as is; other failures get the shared wording. */
export function teamMessage(error: unknown) {
  return error instanceof ApiError && /\s/.test(error.code) ? error.code : errorMessage(error)
}

export type TeamAction = { action: string } & Record<string, unknown>
type ActionResult = { teamId: string; status: string | null }

/** Run a team action through the same route the web portal uses. `onDone` runs after a successful change (reload the screen's data). */
export function useTeamAction(onDone?: () => void) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  async function run(action: TeamAction, success = 'Saved.') {
    if (busy) return null
    setBusy(true); setError(''); setMessage('')
    try {
      const body = await api<{ result: ActionResult }>('/api/member/teams', { method: 'POST', body: action })
      const result = body.result
      const expected = action.action === 'respond' ? (action.decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED') : null
      setMessage(result.status === 'EXPIRED' ? 'This invitation expired. Ask the team lead for a new one.' : expected && result.status !== expected ? `This invitation was already answered. Status: ${result.status?.toLowerCase() ?? 'unavailable'}.` : success)
      onDone?.()
      return result
    } catch (caught) { setError(teamMessage(caught)); return null }
    finally { setBusy(false) }
  }
  return { run, busy, error, message }
}

/** Native stand-in for window.confirm. */
export function confirmThen(title: string, onConfirm: () => void, confirmLabel = 'Confirm') {
  Alert.alert(title, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: confirmLabel, onPress: onConfirm }])
}

export const stageLabels: Record<string, string> = { proposed: 'Proposed', open_for_interest: 'Open for interest', scoping: 'Planning', active: 'Active', complete: 'Complete' }
export const stageLabel = (status: string) => stageLabels[status] ?? status.replaceAll('_', ' ')
export function relativeTime(value: string | null | undefined, now = Date.now()) {
  if (!value) return ''
  const minutes = Math.round((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
}
export const formatDueDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })
export const isOverdue = (dueDate: string | null, status: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })) => Boolean(dueDate && status !== 'DONE' && dueDate < today)
export function progressLine(project: ProjectOverview) {
  const parts = [project.milestonesTotal ? `${project.milestonesDone} of ${project.milestonesTotal} milestones done` : 'No milestones yet']
  if (project.myOpenMilestones) parts.push(`${project.myOpenMilestones} yours`)
  return parts.join(' · ')
}

/** A labelled checkbox. */
export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.check}>
    <Ionicons name={value ? 'checkbox' : 'square-outline'} size={24} color={value ? colors.accent : colors.muted}/>
    <Text style={styles.checkText}>{label}</Text>
  </Pressable>
}

/** Choose one option from a list of any length, with a filter box once the list is long. */
export function PickList({ label, options, value, onChange, empty }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; empty?: string }) {
  const [query, setQuery] = useState('')
  const shown = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()))
  return <View style={styles.pick}>
    <Text style={styles.pickLabel}>{label}</Text>
    {options.length > 8 ? <Field label="Filter" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false}/> : null}
    {shown.length ? shown.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value === value ? '' : option.value)} style={[styles.pickRow, option.value === value && styles.pickRowOn]}>
      <Ionicons name={option.value === value ? 'radio-button-on' : 'radio-button-off'} size={22} color={option.value === value ? colors.accent : colors.muted}/>
      <Text style={styles.pickText}>{option.label}</Text>
    </Pressable>) : <Empty>{empty ?? 'No matches.'}</Empty>}
  </View>
}

export const rosterLine = (people: TeamPerson[]) => people.map(person => person.role === 'LEAD' ? `${person.displayName} (Lead)` : person.displayName).join(', ')

export function TeamRoster({ people }: { people: TeamPerson[] }) {
  return <View style={styles.roster}>{people.map((person, index) => <Text key={person.userId ?? `private-${index}`} style={styles.rosterLine}>{person.displayName}<Text style={styles.muted}>{`  ${person.role === 'LEAD' ? 'Lead' : 'Member'}`}</Text></Text>)}</View>
}

const projectNames = (team: ClubTeam) => team.projects.length ? team.projects.map(project => `${project.title}${project.status !== 'APPROVED' ? ` (${project.status.toLowerCase()})` : ''}`).join(', ') : 'Choosing a project'

/** Search and the Recruiting filter over a list of teams, as the web TeamBrowser. */
export function TeamBrowser({ teams, showCreate = true }: { teams: ClubTeam[]; showCreate?: boolean }) {
  const [query, setQuery] = useState(''), [recruiting, setRecruiting] = useState(false)
  const visible = teams.filter(team => (!recruiting || team.recruiting) && [team.name, team.description, ...team.roster.map(person => person.displayName), ...team.projects.map(project => project.title)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <Field label="Search teams" placeholder="Search teams, members or projects" value={query} onChangeText={setQuery} returnKeyType="search" autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
    <Check label="Recruiting teams" value={recruiting} onChange={setRecruiting}/>
    <Muted>{plural(visible.length, 'team')}</Muted>
    {visible.map(team => <Pressable key={team.id} accessibilityRole="button" onPress={() => router.push(`/teams/group/${team.id}`)} style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <Muted>{team.recruiting ? 'Recruiting' : 'Not recruiting'}</Muted>
        <Heading>{team.name}</Heading>
        {team.description ? <Body>{team.description}</Body> : null}
        <Muted>{`${plural(team.roster.length, 'member')}${team.myRole ? ` · ${team.myRole === 'LEAD' ? 'You lead this team' : 'Your team'}` : ''}`}</Muted>
        {team.roster.length ? <Muted>{rosterLine(team.roster)}</Muted> : null}
        <Muted>{projectNames(team)}</Muted>
        <View style={styles.more}><Text style={styles.moreText}>View team</Text><Ionicons name="arrow-forward" size={16} color={colors.accent}/></View>
      </Card>
    </Pressable>)}
    {!visible.length ? <View style={styles.emptyBox}>
      <Heading>{teams.length ? 'No matching teams' : 'No teams yet'}</Heading>
      {teams.length ? <Button label="Clear filters" kind="secondary" onPress={() => { setQuery(''); setRecruiting(false) }}/> : showCreate ? <Link href="/teams/new" style={styles.link}>Create a team</Link> : null}
    </View> : null}
  </>
}

const styles = StyleSheet.create({
  check: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { flex: 1, fontSize: text.body, color: colors.ink },
  pick: { gap: 6 },
  pickLabel: { fontSize: text.small, fontWeight: '600', color: colors.ink },
  pickRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  pickRowOn: { borderColor: colors.accent },
  pickText: { flex: 1, fontSize: text.body, color: colors.ink },
  roster: { gap: 6 },
  rosterLine: { fontSize: text.body, color: colors.ink },
  muted: { fontSize: text.small, color: colors.muted },
  pressed: { opacity: 0.7 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  moreText: { fontSize: text.body, fontWeight: '600', color: colors.accent },
  emptyBox: { gap: 12, paddingVertical: 12 },
  link: { fontSize: text.body, fontWeight: '600', color: colors.accent, minHeight: 44, paddingVertical: 10 },
})
