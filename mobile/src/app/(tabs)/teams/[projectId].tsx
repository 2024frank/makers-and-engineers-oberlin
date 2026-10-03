import { useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Stack from 'expo-router/stack'
import { ApiError, errorMessage } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { Body, Button, Card, Choice, ErrorState, Heading, Loading, Notice, Screen } from '@/components/ui'
import { TeamLinks } from '@/components/workspace/Links'
import { ApplicationReviewList, TeamProjectRequests } from '@/components/workspace/LeadQueues'
import { MemberWorkspaces } from '@/components/workspace/MemberWorkspaces'
import { MilestoneBoard } from '@/components/workspace/Milestones'
import { KickoffBanner, Overview } from '@/components/workspace/Overview'
import { InviteMember, LeaveProject, Roster } from '@/components/workspace/TeamSection'
import { TeamFeed } from '@/components/workspace/TeamFeed'
import { WebsiteUpdates } from '@/components/workspace/Updates'
import type { Ctx, WorkspaceData } from '@/components/workspace/shared'

type Section = 'workspaces' | 'feed' | 'milestones' | 'team' | 'links' | 'updates'
const sections: { value: Section; label: string }[] = [
  { value: 'workspaces', label: 'Workspaces' }, { value: 'feed', label: 'Team feed' }, { value: 'milestones', label: 'Milestones' },
  { value: 'team', label: 'Team' }, { value: 'links', label: 'Links' }, { value: 'updates', label: 'Updates' },
]

/** Every section stays mounted so a half written note survives a switch to another section. */
function Pane({ show, children }: { show: boolean; children: ReactNode }) {
  return <View style={[{ gap: 12 }, !show && { display: 'none' }]}>{children}</View>
}

export default function TeamWorkspace() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const { data, error, loading, refreshing, reload } = useApi<WorkspaceData>(projectId ? `/api/mobile/workspace/${projectId}` : null)
  const [section, setSection] = useState<Section>('workspaces')
  const ctx = useMemo<Ctx | null>(() => data && projectId ? { projectId, me: data.me, isLead: data.isLead, reload } : null, [data, projectId, reload])

  if (!data || !ctx) {
    const gone = error instanceof ApiError && error.status === 404
    return <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Team workspace' }}/>
      {loading ? <Loading/> : gone ? <Screen>
        <Card>
          <Heading>You are not on this project team</Heading>
          <Body>You may have left the team, been removed, or the project was closed. Your other teams are unchanged.</Body>
          <Button label="My teams" kind="secondary" onPress={() => router.replace('/teams')}/>
          <Button label="Find a project" kind="secondary" onPress={() => router.push('/projects')}/>
        </Card>
      </Screen> : <ErrorState error={error} onRetry={reload}/>}
    </View>
  }

  const { workspace, isLead, started, workLogs, applications, teamRequests, directory } = data
  const { project, roster } = workspace
  const soleLead = isLead && roster.length > 1 && roster.filter(person => person.role === 'LEAD').length === 1
  return <Screen refreshing={refreshing} onRefresh={reload}>
    <Stack.Screen options={{ title: project.title }}/>
    {error ? <Notice error={errorMessage(error)}/> : null}
    <Overview workspace={workspace} isLead={isLead}/>
    {workspace.kickoff ? <KickoffBanner kickoff={workspace.kickoff}/> : null}
    {isLead ? <TeamProjectRequests ctx={ctx} requests={teamRequests}/> : null}
    {isLead ? <ApplicationReviewList ctx={ctx} applications={applications}/> : null}
    <Choice label="Section" options={sections} value={section} onChange={setSection}/>
    <Pane show={section === 'workspaces'}><MemberWorkspaces ctx={ctx} logs={workLogs} roster={roster} started={started}/></Pane>
    <Pane show={section === 'feed'}><TeamFeed ctx={ctx} posts={workspace.posts}/></Pane>
    <Pane show={section === 'milestones'}><MilestoneBoard ctx={ctx} milestones={workspace.milestones} roster={roster}/></Pane>
    <Pane show={section === 'team'}>
      <Roster ctx={ctx} roster={roster}/>
      {isLead ? <InviteMember ctx={ctx} directory={directory} roster={roster}/> : null}
      <LeaveProject ctx={ctx} projectTitle={project.title} soleLead={soleLead}/>
    </Pane>
    <Pane show={section === 'links'}><TeamLinks ctx={ctx} links={workspace.links} githubUrl={project.githubUrl} externalUrl={project.externalUrl}/></Pane>
    <Pane show={section === 'updates'}><WebsiteUpdates ctx={ctx} updates={workspace.updates}/></Pane>
  </Screen>
}
