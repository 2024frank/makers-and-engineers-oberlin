import type { PageSection } from '@/lib/page-builder/types'

export const clubPurpose = 'The club supports interdisciplinary work in engineering, technology, design, robotics, and related fields. All majors are welcome. Participation in a 3-2 program is not required for membership or projects.'

export const clubActivities: Extract<PageSection, { type: 'features_grid' }> = {
  stableKey: 'club-activities', type: 'features_grid', isVisible: true,
  eyebrow: 'Our plans', heading: 'What the club will do', body: clubPurpose,
  items: [
    { title: 'Workshops', icon: '01', body: 'Beginner-friendly, hands-on workshops in CAD and 3D printing, electronics and soldering, Arduino and microcontrollers, coding, and prototyping. Members, staff, and invited guests can share practical skills.' },
    { title: 'Talks from 3-2 students and alumni', icon: '02', body: 'We will invite current 3-2 students at their engineering school and alumni to discuss choosing a school and major, applying, the transition, coursework, and careers. Talks are open to everyone.' },
    { title: 'Capstone projects with CED', icon: '03', body: 'We work with Career Exploration and Development (CED) to connect students with companies on longer projects shaped by student interests. Teams tackle real problems, develop designs, and present work they can discuss in applications, internships, and interviews.' },
    { title: 'Group projects', icon: '04', body: 'Semester-long team projects will let members build together, try different roles, learn from one another, and share their work at showcases.' },
    { title: 'Community building', icon: '05', body: 'Socials, study sessions, and informal build nights will help engineering-minded students from every major find friends, study partners, and mentors.' },
    { title: 'Engineering pathways', icon: '06', body: 'We will connect interested students with academic and career resources, mentors, and official advising for engineering and 3-2 pathways. Participation in a 3-2 program is not required for membership or projects.' },
  ],
}

export const pathwaySupport: Extract<PageSection, { type: 'text_image' }> = {
  stableKey: 'club-pathway-support', type: 'text_image', isVisible: true, layout: 'image_right', imageId: null, imageAlt: '',
  eyebrow: 'Support from the club', heading: 'Explore engineering with other students.',
  body: 'Talks from current 3-2 students and alumni will cover choosing a school and major, applying, moving to an engineering school, coursework, and careers. We will help students find academic and career resources, mentors, and official advising. Participation in a 3-2 program is not required to join the club, attend talks, or take part in projects.',
  cta: { label: 'Explore all club activities', href: '/about#club-activities' },
}

const legacyDisciplines = [
  ['Mechanical', 'CAD, fabrication, 3D printing, and mechanical design.'],
  ['Electrical', 'Circuits, electronics, microcontrollers, sensors, and power.'],
  ['Computing & AI', 'Software, embedded systems, data, and machine learning.'],
  ['Chemical & Materials', 'Chemistry, materials, testing, and process design.'],
  ['Robotics', 'Mechanical systems, electronics, controls, and software.'],
  ['Civil & Environmental', 'Infrastructure, water, energy, and environmental monitoring.'],
]
const legacyPrinciples = [
  ['Build together', 'A project needs a lead, tools, a budget, and a safety plan before it starts.'],
  ['Document the work', 'Teams leave behind project updates, decisions, and public demos.'],
  ['Open the doors', 'Students from every major and experience level can participate.'],
  ['Stay accurate', 'A proposal is labelled a proposal until the work is confirmed.'],
]

function isUntouchedIntroduction(slug: string, section: PageSection) {
  if (!section.isVisible) return false
  if (slug === 'home' && section.stableKey === 'disciplines' && section.type === 'discipline_grid') {
    return ['Engineering brings different fields together.', 'Engineering disciplines'].includes(section.heading)
      && section.items.length === legacyDisciplines.length
      && section.items.every((item, index) => item.name === legacyDisciplines[index][0] && item.description === legacyDisciplines[index][1])
  }
  if (slug === 'about' && section.stableKey === 'principles' && section.type === 'features_grid') {
    return section.heading === 'How the club runs.' && section.eyebrow === 'How we work'
      && section.body === 'The founding group is writing things down so the next set of officers does not start over.'
      && section.items.length === legacyPrinciples.length
      && section.items.every((item, index) => item.title === legacyPrinciples[index][0] && item.body === legacyPrinciples[index][1] && !item.icon)
  }
  return false
}

// Update the public introduction without replacing officers’ custom CMS sections.
export function withClubActivities(slug: string, input: PageSection[]): PageSection[] {
  const sections = [...input]
  if (slug === 'pathway') {
    if (sections.some(section => section.stableKey === pathwaySupport.stableKey)) return sections
    const hero = sections.findIndex(section => section.type === 'hero' && section.isVisible)
    sections.splice(hero + 1, 0, pathwaySupport)
    return sections
  }
  if (!['home', 'about'].includes(slug) || sections.some(section => section.stableKey === clubActivities.stableKey)) return sections
  const legacy = sections.findIndex(section => isUntouchedIntroduction(slug, section))
  if (legacy >= 0) sections.splice(legacy, 1)
  const hero = sections.findIndex(section => section.type === 'hero' && section.isVisible)
  sections.splice(hero + 1, 0, clubActivities)
  return sections
}
