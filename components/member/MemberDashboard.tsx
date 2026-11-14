import Link from 'next/link'
import { ArrowRight, Bell, Briefcase, FolderKanban, Lightbulb, Search, Smartphone, Users } from 'lucide-react'
import type { MemberDashboardSummary } from '@/lib/members/dashboard'
import type { ProjectOverview, WorkspaceSummary } from '@/lib/projects/workspace'
import type { MemberWork } from '@/lib/projects/memberActivity'
import type { ClubTeam } from '@/lib/teams/types'
import { formatDueDate, isOverdue, milestoneStatusLabels, postKindLabels, relativeTime } from '@/lib/projects/labels'
import { MilestoneMeter } from '@/components/projects/MilestoneMeter'
import { QuickMilestoneAction } from './workspace/QuickMilestoneAction'

const emptyWork: MemberWork = { mine: [], unclaimed: [], posts: [] }

function headline(work: MemberWork, hasProjects: boolean) {
  const overdue = work.mine.filter(m => isOverdue(m.dueDate, m.status)).length
  if (work.mine.length) {
    return `You own ${work.mine.length} open milestone${work.mine.length === 1 ? '' : 's'}${overdue ? `, and ${overdue === 1 ? 'one is' : `${overdue} are`} overdue` : ''}.`
  }
  if (work.unclaimed.length) return 'Your teams have milestones nobody has taken yet.'
  if (hasProjects) return 'Your projects are listed below.'
  return 'Join a project team, or bring an idea of your own.'
}

export function MemberDashboard({
  displayName,
  summary,
  teams,
  clubTeams = [],
  progress = [],
  work = emptyWork,
}: {
  displayName: string
  summary: MemberDashboardSummary
  teams: WorkspaceSummary[]
  clubTeams?: ClubTeam[]
  progress?: ProjectOverview[]
  work?: MemberWork
}) {
  const hasProjects = teams.length > 0
  const progressById = new Map(progress.map(item => [item.projectId, item]))
  const firstName = displayName.trim().split(' ')[0] || 'Member'
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)
  const status = [
    {
      href: '/member/applications',
      count: summary.openApplications,
      label: `${plural(summary.openApplications, 'application', 'applications')} awaiting a decision`,
    },
    {
      href: '/member/proposals',
      count: summary.projectProposals,
      label: `${plural(summary.projectProposals, 'project idea', 'project ideas')} in review or approved`,
    },
    {
      href: '/member/saved',
      count: summary.saved,
      label: plural(summary.saved, 'saved item', 'saved items'),
    },
  ].filter(item => item.count > 0)

  const discoveryCards = (
    <div className={`portal-task-grid${hasProjects ? ' portal-task-grid--compact' : ''}`}>
      <Link className="portal-task" href="/member/projects">
        <Search size={22} aria-hidden="true" />
        <h3>Find a project</h3>
        <p>Explore teams looking for members.</p>
        <span>
          Browse projects <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
      <Link className="portal-task" href="/member/proposals?new=1">
        <Lightbulb size={22} aria-hidden="true" />
        <h3>Propose an idea</h3>
        <p>Bring a new project to the club.</p>
        <span>
          Start a proposal <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
      <Link className="portal-task" href="/member/directory">
        <Users size={22} aria-hidden="true" />
        <h3>Find teammates</h3>
        <p>Meet members with shared interests.</p>
        <span>
          Member directory <ArrowRight size={16} aria-hidden="true" />
        </span>
      </Link>
    </div>
  )

  return (
    <main className="admin-panel portal-home pt-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Member workspace</p>
          <h1>Hi, {firstName}.</h1>
          <p>{headline(work, hasProjects)}</p>
        </div>
        <div className="admin-quick-actions">
          <Link className="button button--ghost" href="/member/profile">
            My profile
          </Link>
        </div>
      </div>

      <section className="portal-section" aria-label="Member summary">
        <div className="member-dashboard-cards">
          <Link href="/member/teams">
            <span>Active teams</span>
            <strong>{summary.activeTeams}</strong>
            <small>View project teams →</small>
          </Link>
          <Link href="/member/applications">
            <span>Open applications</span>
            <strong>{summary.openApplications}</strong>
            <small>Track applications →</small>
          </Link>
          <Link href="/member/invitations">
            <span>Pending invitations</span>
            <strong>{summary.pendingInvitations}</strong>
            <small>Review invitations →</small>
          </Link>
          <Link href="/member/saved">
            <span>Saved items</span>
            <strong>{summary.saved}</strong>
            <small>Open saved list →</small>
          </Link>
        </div>
      </section>

      <section className="portal-section" aria-label="Your next actions">
        <div className="portal-review-list">
          {summary.pendingInvitations > 0 && (
            <Link href="/member/invitations">
              <span className="portal-review-icon">
                <Users size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>
                  {summary.pendingInvitations} team invitation
                  {summary.pendingInvitations === 1 ? '' : 's'}
                </strong>
                <small>Waiting for your response</small>
              </span>
              <span className="portal-count">{summary.pendingInvitations}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
          {summary.unreadNotifications > 0 && (
            <Link href="/member/notifications">
              <span className="portal-review-icon">
                <Bell size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>
                  {summary.unreadNotifications} unread update
                  {summary.unreadNotifications === 1 ? '' : 's'}
                </strong>
                <small>Club and project activity</small>
              </span>
              <span className="portal-count">{summary.unreadNotifications}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
          <Link href="/member/capstone">
            <span className="portal-review-icon">
              <Briefcase size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>Apply for a capstone project</strong>
              <small>Share your interests and resume for projects with CED.</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/app">
            <span className="portal-review-icon">
              <Smartphone size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>Get the MEO Members app</strong>
              <small>Download for Android. iPhone is coming soon.</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {!hasProjects && (
        <section className="portal-section" aria-labelledby="member-start">
          <div className="portal-section-heading">
            <h2 id="member-start">Start with a project</h2>
          </div>
          {discoveryCards}
        </section>
      )}

      {hasProjects && (
        <section className="portal-section" aria-labelledby="member-projects">
          <div className="portal-section-heading">
            <h2 id="member-projects">
              Your projects <span>{teams.length}</span>
            </h2>
            <Link href="/member/teams">
              All teams <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="dash-projects">
            {teams.slice(0, 6).map(team => {
              const item = progressById.get(team.projectId)
              return (
                <Link key={team.projectId} className="dash-project" href={`/member/teams/${team.projectId}`}>
                  <span className="dash-project__title">
                    <strong>{team.title}</strong>
                    <small>
                      {team.membershipRole === 'LEAD' ? 'You lead this project' : 'Team member'}
                      {item?.myOpenMilestones
                        ? `, ${item.myOpenMilestones} milestone${item.myOpenMilestones === 1 ? '' : 's'} yours`
                        : ''}
                    </small>
                  </span>
                  <span className="dash-project__progress">
                    {item?.milestonesTotal ? (
                      <MilestoneMeter done={item.milestonesDone} total={item.milestonesTotal} />
                    ) : (
                      <small>No milestones yet</small>
                    )}
                    {item?.nextMilestone && (
                      <small
                        className={
                          isOverdue(item.nextMilestone.dueDate, item.nextMilestone.status)
                            ? 'pt-overdue'
                            : ''
                        }
                      >
                        Next: {item.nextMilestone.title}
                        {item.nextMilestone.dueDate
                          ? `, due ${formatDueDate(item.nextMilestone.dueDate)}`
                          : ''}
                      </small>
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {hasProjects && (work.mine.length > 0 || work.unclaimed.length > 0 || work.posts.length > 0) && (
        <div className="dash-columns">
          <section className="pt-card" aria-labelledby="member-milestones">
            <div className="portal-section-heading">
              <h2 id="member-milestones">Your milestones</h2>
            </div>
            {work.mine.length ? (
              <ul className="dash-list">
                {work.mine.map(m => (
                  <li key={m.id}>
                    <div>
                      <strong>{m.title}</strong>
                      <small>
                        <Link href={`/member/teams/${m.projectId}`}>{m.projectTitle}</Link>
                        {m.dueDate && (
                          <span>
                            {isOverdue(m.dueDate, m.status) && (
                              <span className="pt-pill pt-pill--bad dash-overdue">Overdue</span>
                            )}
                            Due {formatDueDate(m.dueDate)}
                          </span>
                        )}
                        <span>{milestoneStatusLabels[m.status]}</span>
                      </small>
                    </div>
                    <QuickMilestoneAction
                      projectId={m.projectId}
                      milestoneId={m.id}
                      title={m.title}
                      mode="done"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-hint">You have no milestones of your own right now.</p>
            )}
            {work.unclaimed.length > 0 && (
              <>
                <h3 className="dash-subhead">Unclaimed milestones</h3>
                <ul className="dash-list">
                  {work.unclaimed.map(m => (
                    <li key={m.id}>
                      <div>
                        <strong>{m.title}</strong>
                        <small>
                          <Link href={`/member/teams/${m.projectId}`}>{m.projectTitle}</Link>
                          {m.dueDate && <span>Due {formatDueDate(m.dueDate)}</span>}
                        </small>
                      </div>
                      <QuickMilestoneAction
                        projectId={m.projectId}
                        milestoneId={m.id}
                        title={m.title}
                        mode="claim"
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="pt-card" aria-labelledby="member-activity">
            <div className="portal-section-heading">
              <h2 id="member-activity">Latest from your teams</h2>
            </div>
            {work.posts.length ? (
              <ul className="pt-feed">
                {work.posts.map(post => (
                  <li className="pt-post" key={post.id}>
                    <header>
                      <strong>{post.authorName}</strong>
                      <span
                        className={`pt-pill ${
                          post.kind === 'BLOCKER'
                            ? 'pt-pill--bad'
                            : post.kind === 'WIN'
                              ? 'pt-pill--good'
                              : post.kind === 'QUESTION'
                                ? 'pt-pill--warn'
                                : ''
                        }`}
                      >
                        {postKindLabels[post.kind]}
                      </span>
                      <time dateTime={post.createdAt} suppressHydrationWarning>
                        {relativeTime(post.createdAt)}
                      </time>
                    </header>
                    <p>{post.body}</p>
                    <Link className="dash-post-link" href={`/member/teams/${post.projectId}#team-feed`}>
                      {post.projectTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-hint">
                No team posts yet. Share what you worked on in your project&apos;s team feed.
              </p>
            )}
          </section>
        </div>
      )}

      <section className="portal-section" aria-labelledby="member-teams">
        <div className="portal-section-heading">
          <h2 id="member-teams">
            Club teams <span>{clubTeams.length}</span>
          </h2>
          <Link href="/member/teams/find">
            Find a team <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {clubTeams.length > 0 ? (
          <div className="portal-review-list">
            {clubTeams.map(team => (
              <Link href={`/member/teams/group/${team.id}`} key={team.id}>
                <span className="portal-review-icon">
                  <Users size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>{team.name}</strong>
                  <small>
                    {team.roster.length} member{team.roster.length === 1 ? '' : 's'}
                  </small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="portal-empty">
            <FolderKanban size={24} aria-hidden="true" />
            <div>
              <h3>No club team yet</h3>
              <p>Club teams are groups of members who work together before or across projects.</p>
              <Link className="portal-text-link" href="/member/teams/new">
                Create a team
              </Link>
            </div>
          </div>
        )}
      </section>

      {status.length > 0 && (
        <section className="portal-section" aria-label="Applications, ideas and saved items">
          <div className="portal-review-list">
            {status.map(item => (
              <Link key={item.href} href={item.href}>
                <span>
                  <strong>
                    {item.count} {item.label}
                  </strong>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasProjects && (
        <section className="portal-section" aria-labelledby="member-more">
          <div className="portal-section-heading">
            <h2 id="member-more">More to do</h2>
          </div>
          {discoveryCards}
        </section>
      )}
    </main>
  )
}
