import { useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Choice, ErrorState, Field, Heading, Loading, Muted, Notice, Screen, Title } from '@/components/ui'
import { plural, useTeamAction, type DirectoryMember } from '@/components/teams/shared'
import { colors, text } from '@/lib/theme'
import { useApi } from '@/lib/useApi'

type Member = DirectoryMember & { joinedTeams: { id: string; name: string }[]; joinedProjects: { projectId: string; title: string }[]; invitableTeams: { id: string; name: string }[] }
type Response = { currentUserId: string; members: Member[]; options: { disciplines: string[]; skills: string[]; majors: string[]; classYears: number[]; interests: string[] } }
type Filters = { discipline: string; skill: string; major: string; year: string; interest: string; availability: string }
const noFilters: Filters = { discipline: '', skill: '', major: '', year: '', interest: '', availability: '' }

const choices = (values: (string | number)[]) => [{ value: '', label: 'All' }, ...values.map(value => ({ value: String(value), label: String(value) }))]
const tagLine = (label: string, items?: string[]) => items?.length ? <View key={label}><Text style={styles.tagLabel}>{label}</Text><Text style={styles.tags}>{items.join(', ')}</Text></View> : null

function InviteControl({ userId, memberName, teams }: { userId: string; memberName: string; teams: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false), [teamId, setTeamId] = useState('')
  const action = useTeamAction()
  if (!teams.length) return <Link href={{ pathname: '/teams/new', params: { invite: userId } }} style={styles.link}>Create a team together</Link>
  return <View style={styles.gap}>
    {!open ? <Button label="Invite to team" icon="person-add" kind="secondary" onPress={() => setOpen(true)}/> : <>
      <Choice label={`Team for ${memberName}`} value={teamId} onChange={setTeamId} options={teams.map(team => ({ value: team.id, label: team.name }))}/>
      <Button label={action.busy ? 'Sending...' : 'Send invitation'} icon="send" busy={action.busy} disabled={!teamId || Boolean(action.message)} onPress={() => void action.run({ action: 'invite', teamId, userId }, 'Invitation sent. They can accept it in their account.')}/>
      <Button label="Close" kind="secondary" onPress={() => setOpen(false)}/>
    </>}
    <Notice error={action.error} message={action.message}/>
  </View>
}

function MemberCard({ member, currentUserId }: { member: Member; currentUserId: string }) {
  const links: [string, string | undefined][] = [['Portfolio', member.portfolioUrl], ['GitHub', member.githubUrl], ['LinkedIn', member.linkedinUrl], ['Email', member.contactEmail && `mailto:${member.contactEmail}`]]
  const subtitle = [member.major, member.classYear && `Class of ${member.classYear}`].filter(Boolean).join(' · ')
  return <Card>
    <View style={styles.head}>
      <View style={styles.initial}><Text style={styles.initialText}>{(member.displayName ?? 'O').slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.flex}><Heading>{member.displayName ?? 'Member'}</Heading>{subtitle ? <Muted>{subtitle}</Muted> : null}</View>
    </View>
    {tagLine('Disciplines', member.disciplines)}{tagLine('Skills', member.skills)}{tagLine('Project interests', member.projectInterests)}
    {member.availability ? <Body><Text style={styles.bold}>Availability:</Text> {member.availability}</Body> : null}
    {links.some(([, url]) => url) ? <View style={styles.links}>{links.map(([label, url]) => url ? <Pressable key={label} accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={styles.linkBox}><Text style={styles.linkText}>{label}</Text></Pressable> : null)}</View> : null}
    <View>
      {member.joinedTeams.map(team => <Pressable key={team.id} accessibilityRole="link" onPress={() => router.push(`/teams/group/${team.id}`)} style={styles.linkBox}><Text style={styles.linkText}>{`Team: ${team.name}`}</Text></Pressable>)}
      {member.joinedProjects.map(project => <Muted key={project.projectId} style={styles.line}>{`Project: ${project.title}`}</Muted>)}
      {!member.joinedTeams.length && !member.joinedProjects.length ? <Muted>No shared teams or projects listed.</Muted> : null}
    </View>
    {member.userId !== currentUserId && member.displayName ? <InviteControl userId={member.userId} memberName={member.displayName} teams={member.invitableTeams}/> : null}
  </Card>
}

export default function Directory() {
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [filters, setFilters] = useState(noFilters), [open, setOpen] = useState(false), [availability, setAvailability] = useState('')
  useEffect(() => { const timer = setTimeout(() => setSearch(query), 400); return () => clearTimeout(timer) }, [query])
  useEffect(() => { const timer = setTimeout(() => setFilters(current => ({ ...current, availability })), 400); return () => clearTimeout(timer) }, [availability])
  const pairs = Object.entries({ q: search, ...filters }).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)
  const queryString = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
  const { data, error, loading, refreshing, reload } = useApi<Response>(`/api/mobile/directory${queryString ? `?${queryString}` : ''}`)
  const set = (key: keyof Filters) => (value: string) => setFilters(current => ({ ...current, [key]: value }))
  const active = Object.values(filters).some(Boolean)
  const options = data?.options
  return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: 'Directory' }}/>
    <Title>Member directory</Title>
    <Muted>Meet members, see their projects, and invite them to work with you.</Muted>
    <Field label="Search" placeholder="Name, skill, discipline…" value={query} onChangeText={setQuery} returnKeyType="search" autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"/>
    <Button label={open ? 'Hide filters' : active ? 'Filters (on)' : 'Filters'} kind="secondary" icon="options" onPress={() => setOpen(!open)}/>
    {open ? <Card>
      {options ? <>
        <Choice label="Discipline" value={filters.discipline} onChange={set('discipline')} options={choices(options.disciplines)}/>
        <Choice label="Skill" value={filters.skill} onChange={set('skill')} options={choices(options.skills)}/>
        <Choice label="Major" value={filters.major} onChange={set('major')} options={choices(options.majors)}/>
        <Choice label="Class year" value={filters.year} onChange={set('year')} options={choices(options.classYears)}/>
        <Choice label="Project interest" value={filters.interest} onChange={set('interest')} options={choices(options.interests)}/>
      </> : null}
      <Field label="Availability" placeholder="weekends" value={availability} onChangeText={setAvailability} autoCapitalize="none" autoCorrect={false}/>
      {active ? <Button label="Clear filters" kind="secondary" onPress={() => { setFilters(noFilters); setAvailability('') }}/> : null}
    </Card> : null}
    {loading && !data ? <Loading/> : error && !data ? <ErrorState error={error} onRetry={reload}/> : data ? <>
      <Muted>{`${plural(data.members.length, 'member')} shown`}</Muted>
      {data.members.length ? data.members.map(member => <MemberCard key={member.userId} member={member} currentUserId={data.currentUserId}/>) : <View style={styles.gap}>
        <Heading>No matching members</Heading>
        <Muted>Try clearing one or more filters.</Muted>
      </View>}
    </> : null}
  </Screen>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: text.heading, fontWeight: '700', color: '#ffffff' },
  tagLabel: { fontSize: text.tiny, fontWeight: '600', color: colors.muted },
  tags: { fontSize: text.body, lineHeight: 23, color: colors.ink },
  bold: { fontWeight: '600' },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20 },
  linkBox: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: text.body, fontWeight: '600', color: colors.accent },
  link: { fontSize: text.body, fontWeight: '600', color: colors.accent, minHeight: 44, paddingVertical: 10 },
  line: { paddingVertical: 4 },
})
