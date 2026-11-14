import { decodeHtmlEntities } from './htmlEntities'
import type { PageSection } from '@/lib/page-builder/types'

export const homeIntroduction = 'An interdisciplinary club for engineering, technology, design, and robotics at Oberlin. Learn practical skills, meet students and alumni, build with others, and explore where your interests can take you.'

// Retire exact starter copy without replacing later edits made in the officer portal.
const replacements: Record<string, string> = {
  'We bring Oberlin students together to work on engineering projects. Browse the proposals, find people to work with, or suggest an idea of your own.': homeIntroduction,
  'Members come from physics, computer science, chemistry, mathematics, environmental studies, and other departments.': 'We bring students from every major together around engineering, technology, design, robotics, and related fields. Join to learn, make things, find community, and explore engineering pathways.',
  'A student engineering club at Oberlin for projects, workshops, technical opportunities, and students exploring the 3-2 pathway.': homeIntroduction,
  'Build things. Learn together.': 'Student engineering projects at Oberlin College.',
  'Makers and Engineers @Oberlin': 'Oberlin College',
  'Join MEO': 'Join Projects for Makers and Engineers',
  'Build something with us.': 'Projects',
  'Help run the club.': 'Help with the club',
  'These roles are open now. They are how the club actually gets built this year.': 'Interested in organizing events or helping with projects? Choose an option in the form above and tell us what you would like to do.',
  'MEO projects give students a chance to work on engineering problems outside class. That can mean hardware, software, CAD, electronics, robotics, or testing.': 'These projects are open to MEO members. Read a proposal to see what is involved, then express interest through your membership account.',
  'A club for students who build things.': 'About the club',
  'Oberlin’s 3-2 program combines three years of liberal arts study at Oberlin with two years at a partner engineering school. Students interested in engineering are also spread across physics, computer science, chemistry, mathematics, environmental studies, and other departments. MEO gives those students a place to meet, build projects, share resources, and learn from each other.': 'Students interested in engineering come from every department at Oberlin. As a chartered student club, MEO brings makers, designers, programmers, and 3-2 students together to build real projects outside class.',
  'Engineering at Oberlin works differently.': 'Inside Makers and Engineers',
  'Engineering disciplines': 'Areas of interest',
  'Engineering brings different fields together.': 'Areas of interest',
  'How the club runs.': 'How we work',
  'The founding group is writing things down so the next set of officers does not start over.': 'Project teams meet regularly in campus makerspaces, share CAD and documentation in their workspaces, and open builds to students of all experience levels.',
  'Build together': 'Project teams',
  'A project needs a lead, tools, a budget, and a safety plan before it starts.': 'Each team aligns on scope, hardware or software tools, shared files, and clear milestones.',
  'Document the work': 'Project updates',
  'Teams leave behind project updates, decisions, and public demos.': 'Members use their workspaces to post progress, upload CAD and schematics, and showcase demos.',
  'Open the doors': 'Who can join',
  'Students from every major and experience level can participate.': 'Any Oberlin student can join. You do not need previous engineering experience or plans to enter the 3-2 program.',
  'Stay accurate': 'Getting started',
  'A proposal is labelled a proposal until the work is confirmed.': 'Set up your member account, browse active builds, join a project team, or pitch a new project idea.',
  'Help get the club started.': 'Join the club',
  'Join a project, propose one, volunteer, or help lead a recurring part of the club.': 'Join a project team, bring a build idea to our next meeting, or collaborate at weekly studio sessions.',
  'Meetings, build nights, and talks.': 'Events',
  'Our first events are being planned for Fall 2026. Expect project meetups, technical workshops, alumni conversations, and engineering career events.': 'Weekly build nights, technical workshops, alumni conversations, and engineering career sessions run throughout the semester.',
  'What the club will do': 'What we do',
  'Opportunities worth knowing about': 'Opportunities',
  'Internships, research, and funding.': 'Opportunities',
  'Find engineering internships, research positions, fellowships, campus programs, and other opportunities worth knowing about.': 'Internships, research positions, and funding shared by the club. Check each listing for requirements and deadlines.',
  'We are gathering engineering internships, research positions, fellowships, and funding worth knowing about. Join MEO and we will share them as they land.': 'There are no active listings at this moment. Members share new fellowships and internships here throughout the semester.',
}

export function retireCopy(text: string) {
  return replacements[text] ?? text
}

export function publicCopy(text: string) {
  const decoded = decodeHtmlEntities(text)
  return replacements[decoded] ?? decoded
}

export function refreshSectionCopy(section: PageSection): PageSection {
  const next = { ...section }
  if ('headline' in next) next.headline = publicCopy(next.headline)
  if ('heading' in next) next.heading = publicCopy(next.heading)
  if ('body' in next) next.body = publicCopy(next.body)
  if ('eyebrow' in next) next.eyebrow = publicCopy(next.eyebrow)
  if ('primaryCta' in next && next.primaryCta) next.primaryCta = { ...next.primaryCta, label: publicCopy(next.primaryCta.label) }
  if ('secondaryCta' in next && next.secondaryCta) next.secondaryCta = { ...next.secondaryCta, label: publicCopy(next.secondaryCta.label) }
  if ('cta' in next && next.cta) next.cta = { ...next.cta, label: publicCopy(next.cta.label) }
  if (next.type === 'features_grid') next.items = next.items.map(item => ({ ...item, title: publicCopy(item.title), body: publicCopy(item.body) }))
  return next
}

export function refreshSeedEvent<T extends Record<string, unknown>>(event: T): T {
  if (event.slug !== 'founding-meetup') return event
  const changes: Record<string, string> = {}
  if (event.title === 'Founding Meetup') changes.title = 'First interest meeting'
  if (event.summary === 'Meet other interested students, review the first-year plan, and choose which projects and events deserve attention first.') {
    changes.summary = 'Meet the club, discuss project ideas, and find people to work with.'
  }
  if (event.description === 'The date, time, and room are being scheduled. Pizza and accessibility details will be confirmed with the final announcement.') {
    changes.description = "We will introduce the club, discuss the proposed projects, and start forming teams. Before the meeting, please set up your membership account and add your skills to your profile. Propose a project or express interest in one you would like to join."
  }
  return { ...event, ...changes }
}
