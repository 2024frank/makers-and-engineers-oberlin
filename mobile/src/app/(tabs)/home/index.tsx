import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Stack from 'expo-router/stack'
import { Body, Button, Card, Empty, ErrorState, Heading, Loading, Muted, Notice, Row, Screen, Title } from '@/components/ui'
import { MilestoneMeter, SectionHead, TextLink } from '@/components/home/parts'
import { formatDueDate, isOverdue, milestoneStatusLabels, plural, postKindLabels, relativeTime } from '@/components/home/format'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, text } from '@/lib/theme'
import { useApi } from '@/lib/useApi'

type MilestoneStatus = keyof typeof milestoneStatusLabels
type Milestone = { id: string; title: string; status: MilestoneStatus; dueDate: string | null; projectId: string; projectTitle: string }
type Post = { id: string; projectId: string; projectTitle: string; kind: keyof typeof postKindLabels; body: string; authorName: string; createdAt: string }
type Dashboard = {
  displayName: string
  summary: { saved: number; openApplications: number; pendingInvitations: number; activeTeams: number; projectProposals: number; unreadNotifications: number }
  teams: { projectId: string; title: string; membershipRole: 'LEAD' | 'MEMBER' }[]
  clubTeams: { id: string; name: string; memberCount: number }[]
  progress: { projectId: string; myOpenMilestones: number; milestonesTotal: number; milestonesDone: number; nextMilestone: { title: string; dueDate: string | null; status: MilestoneStatus } | null }[]
  work: { mine: Milestone[]; unclaimed: Milestone[]; posts: Post[] }
}

// Copied from the web workspace messages, for the two quick milestone actions.
const actionMessages: Record<string, string> = {
  OFFLINE: 'Could not reach the server. Nothing changed; please try again.',
  PROJECT_LEAD_REQUIRED: 'Only a project lead can do that.',
  PROJECT_MEMBER_REQUIRED: 'You are no longer on this project team. Refresh the page.',
  MILESTONE_ALREADY_CLAIMED: 'A teammate already took this milestone.',
  MILESTONE_NOT_YOURS: 'Only the person who took this milestone, or a lead, can hand it back.',
  MILESTONE_NOT_FOUND: 'This milestone was removed. Refresh the page.',
  PROJECT_NOT_STARTED: 'Workspaces open once a club officer starts the project.',
}
const actionFallback = 'That change could not be saved. Please try again.'

function headline(work: Dashboard['work'], hasProjects: boolean) {
  const overdue = work.mine.filter(m => isOverdue(m.dueDate, m.status)).length
  if (work.mine.length) return `You own ${work.mine.length} open milestone${work.mine.length === 1 ? '' : 's'}${overdue ? `, and ${overdue === 1 ? 'one is' : `${overdue} are`} overdue` : ''}.`
  if (work.unclaimed.length) return 'Your teams have milestones nobody has taken yet.'
  if (hasProjects) return 'Your projects are listed below.'
  return 'Join a project team, or bring an idea of your own.'
}

const tasks = [
  { title: 'Find a project', detail: 'Explore teams looking for members.', icon: 'search-outline', href: '/projects' },
  { title: 'Propose an idea', detail: 'Bring a new project to the club.', icon: 'bulb-outline', href: '/projects/proposals?new=1' },
  { title: 'Find teammates', detail: 'Meet members with shared interests.', icon: 'people-outline', href: '/directory' },
] as const

function Tasks() {
  return <Card>{tasks.map((task, index) => <Row key={task.title} icon={task.icon} title={task.title} detail={task.detail} last={index === tasks.length - 1} onPress={() => router.push(task.href)}/>)}</Card>
}

function MilestoneItem({ milestone, mode, busy, error, onRun }: { milestone: Milestone; mode: 'done' | 'claim'; busy: boolean; error?: string; onRun: () => void }) {
  const overdue = mode === 'done' && isOverdue(milestone.dueDate, milestone.status)
  return <View style={styles.item}>
    <Text style={styles.itemTitle}>{milestone.title}</Text>
    <Pressable accessibilityRole="link" onPress={() => router.push(`/teams/${milestone.projectId}`)} style={styles.projectLink}><Text style={styles.projectLinkText}>{milestone.projectTitle}</Text></Pressable>
    <Muted>
      {overdue ? <Text style={styles.overdue}>Overdue </Text> : null}
      {milestone.dueDate ? `Due ${formatDueDate(milestone.dueDate)}` : ''}
      {mode === 'done' ? `${milestone.dueDate ? '. ' : ''}${milestoneStatusLabels[milestone.status]}` : ''}
    </Muted>
    <Button label={mode === 'done' ? 'Mark done' : "I'll take it"} icon={mode === 'done' ? 'checkmark' : 'hand-left-outline'} kind="secondary" busy={busy} onPress={onRun}/>
    {error ? <Notice error={error}/> : null}
  </View>
}

export default function Home() {
  const { data, error, loading, refreshing, reload } = useApi<Dashboard>('/api/mobile/dashboard')
  const { refresh } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onRefresh = () => { void reload(); void refresh() }
  async function run(milestone: Milestone, mode: 'done' | 'claim') {
    if (busyId) return
    setBusyId(milestone.id); setErrors(current => ({ ...current, [milestone.id]: '' }))
    try {
      await api(`/api/member/projects/${milestone.projectId}`, { method: 'PUT', body: mode === 'done' ? { action: 'milestone-status', milestoneId: milestone.id, status: 'DONE' } : { action: 'milestone-claim', milestoneId: milestone.id, claim: true } })
      await reload()
    } catch (caught) {
      const message = errorMessage(caught, actionMessages)
      setErrors(current => ({ ...current, [milestone.id]: message === errorMessage(null) ? actionFallback : message }))
    } finally { setBusyId(null) }
  }

  const header = <Stack.Screen options={{ title: 'Home' }}/>
  if (loading && !data) return <Screen>{header}<Loading/></Screen>
  if (!data) return <Screen refreshing={refreshing} onRefresh={onRefresh}>{header}<ErrorState error={error} onRetry={onRefresh}/></Screen>

  const { summary, teams, clubTeams, progress, work } = data
  const hasProjects = teams.length > 0
  const status = [
    { href: '/projects/applications', count: summary.openApplications, label: plural(summary.openApplications, 'application', 'applications') + ' awaiting a decision' },
    { href: '/projects/proposals', count: summary.projectProposals, label: plural(summary.projectProposals, 'project idea', 'project ideas') + ' in review or approved' },
    { href: '/projects/saved', count: summary.saved, label: plural(summary.saved, 'saved item', 'saved items') },
  ].filter(item => item.count > 0)
  const attention = summary.pendingInvitations > 0 || summary.unreadNotifications > 0

  return <Screen refreshing={refreshing} onRefresh={onRefresh}>
    {header}
    <View style={styles.hello}>
      <Title>{`Hi, ${data.displayName.trim().split(' ')[0]}.`}</Title>
      <Body>{headline(work, hasProjects)}</Body>
      <TextLink label="My profile" onPress={() => router.push('/more/profile')}/>
    </View>
    {error ? <Notice error={errorMessage(error)}/> : null}

    {attention ? <Card>
      {summary.pendingInvitations > 0 ? <Row icon="people-outline" title={`${summary.pendingInvitations} team invitation${summary.pendingInvitations === 1 ? '' : 's'}`} detail="Waiting for your response" last={summary.unreadNotifications === 0} onPress={() => router.push('/projects/invitations')}/> : null}
      {summary.unreadNotifications > 0 ? <Row icon="notifications-outline" title={`${summary.unreadNotifications} unread update${summary.unreadNotifications === 1 ? '' : 's'}`} detail="Club and project activity" last onPress={() => router.push('/home/notifications')}/> : null}
    </Card> : null}

    {!hasProjects ? <><SectionHead>Start with a project</SectionHead><Tasks/></> : null}

    {hasProjects ? <>
      <SectionHead linkLabel="All teams" onLink={() => router.push('/teams')}>Your projects</SectionHead>
      {teams.slice(0, 6).map(team => {
        const item = progress.find(entry => entry.projectId === team.projectId)
        const next = item?.nextMilestone
        return <Pressable key={team.projectId} accessibilityRole="button" onPress={() => router.push(`/teams/${team.projectId}`)} style={({ pressed }) => pressed && styles.pressed}>
          <Card>
            <Text style={styles.itemTitle}>{team.title}</Text>
            <Muted>{team.membershipRole === 'LEAD' ? 'You lead this project' : 'Team member'}{item?.myOpenMilestones ? `, ${item.myOpenMilestones} milestone${item.myOpenMilestones === 1 ? '' : 's'} yours` : ''}</Muted>
            {item?.milestonesTotal ? <MilestoneMeter done={item.milestonesDone} total={item.milestonesTotal}/> : <Muted>No milestones yet</Muted>}
            {next ? <Muted style={isOverdue(next.dueDate, next.status) ? styles.overdue : undefined}>{`Next: ${next.title}${next.dueDate ? `, due ${formatDueDate(next.dueDate)}` : ''}`}</Muted> : null}
          </Card>
        </Pressable>
      })}
    </> : null}

    {hasProjects && (work.mine.length > 0 || work.unclaimed.length > 0 || work.posts.length > 0) ? <>
      <Card>
        <Heading>Your milestones</Heading>
        {work.mine.length ? work.mine.map(m => <MilestoneItem key={m.id} milestone={m} mode="done" busy={busyId === m.id} error={errors[m.id]} onRun={() => void run(m, 'done')}/>) : <Empty>You have no milestones of your own right now.</Empty>}
        {work.unclaimed.length > 0 ? <>
          <Text style={styles.subhead}>Unclaimed milestones</Text>
          {work.unclaimed.map(m => <MilestoneItem key={m.id} milestone={m} mode="claim" busy={busyId === m.id} error={errors[m.id]} onRun={() => void run(m, 'claim')}/>)}
        </> : null}
      </Card>
      <Card>
        <Heading>Latest from your teams</Heading>
        {work.posts.length ? work.posts.map(post => <View key={post.id} style={styles.item}>
          <Text style={styles.itemTitle}>{post.authorName}</Text>
          <Muted>{`${postKindLabels[post.kind]}, ${relativeTime(post.createdAt)}`}</Muted>
          <Body>{post.body.length > 220 ? `${post.body.slice(0, 220).trimEnd()}...` : post.body}</Body>
          <Pressable accessibilityRole="link" onPress={() => router.push(`/teams/${post.projectId}`)} style={styles.projectLink}><Text style={styles.projectLinkText}>{post.projectTitle}</Text></Pressable>
        </View>) : <Empty>No team posts yet. Share what you worked on in your project's team feed.</Empty>}
      </Card>
    </> : null}

    <SectionHead linkLabel="Find a team" onLink={() => router.push('/teams/find')}>Club teams</SectionHead>
    {clubTeams.length > 0 ? <Card>{clubTeams.map((team, index) => <Row key={team.id} icon="people-outline" title={team.name} detail={`${team.memberCount} member${team.memberCount === 1 ? '' : 's'}`} last={index === clubTeams.length - 1} onPress={() => router.push(`/teams/group/${team.id}`)}/>)}</Card>
      : <Card>
        <Heading>No club team yet</Heading>
        <Body>Club teams are groups of members who work together before or across projects.</Body>
        <TextLink label="Create a team" onPress={() => router.push('/teams/new')}/>
      </Card>}

    {status.length > 0 ? <Card>{status.map((item, index) => <Row key={item.href} title={`${item.count} ${item.label}`} last={index === status.length - 1} onPress={() => router.push(item.href)}/>)}</Card> : null}

    {hasProjects ? <><SectionHead>More to do</SectionHead><Tasks/></> : null}
  </Screen>
}

const styles = StyleSheet.create({
  hello: { gap: 6 },
  pressed: { opacity: 0.7 },
  item: { gap: 4, paddingVertical: 8 },
  itemTitle: { fontSize: text.body, fontWeight: '700', color: colors.ink },
  subhead: { fontSize: text.body, fontWeight: '700', color: colors.ink, marginTop: 8 },
  projectLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  projectLinkText: { fontSize: text.small, fontWeight: '600', color: colors.accent },
  overdue: { color: colors.danger, fontWeight: '600' },
})
