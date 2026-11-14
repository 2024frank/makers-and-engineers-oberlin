import type { PageSection } from '@/lib/page-builder/types'

export const clubPurpose = 'Projects for Makers and Engineers is an active, chartered Oberlin student organization supporting hands-on engineering, technology, design, and robotics across all majors. No 3-2 program affiliation or prior experience is required.'

export const clubActivities: Extract<PageSection, { type: 'features_grid' }> = {
  stableKey: 'club-activities', type: 'features_grid', isVisible: true,
  eyebrow: 'Chartered club', heading: 'What we do', body: clubPurpose,
  items: [
    { title: 'Workshops', icon: '01', body: 'Beginner-friendly, hands-on workshops in CAD and 3D printing, electronics and soldering, Arduino and microcontrollers, coding, and prototyping led by members, faculty, and guests.' },
    { title: 'Talks from 3-2 students and alumni', icon: '02', body: 'We invite current 3-2 engineering students and alumni to discuss choosing a school and major, applying, transitioning coursework, and careers. Talks are open to everyone.' },
    { title: 'Capstone projects with CED', icon: '03', body: 'We partner with Career Exploration and Development (CED) to connect students with organizations on real engineering projects they can showcase in internships and applications.' },
    { title: 'Group projects', icon: '04', body: 'Semester-long team projects give members space to build hardware and software together, try new roles, share files and CAD, and demo finished work.' },
    { title: 'Community building', icon: '05', body: 'Weekly build nights, socials, and studio study sessions bring engineering-minded Oberlin students across every major together with peers and mentors.' },
    { title: 'Engineering pathways', icon: '06', body: 'We connect students with peers, mentors, academic resources, and official advising for graduate study, industry engineering, and the 3-2 pathway.' },
  ],
}

export const pathwaySupport: Extract<PageSection, { type: 'text_image' }> = {
  stableKey: 'club-pathway-support', type: 'text_image', isVisible: true, layout: 'image_right', imageId: null, imageAlt: '',
  eyebrow: 'Support from the club', heading: 'Explore engineering with other students.',
  body: 'Talks from current 3-2 students and alumni cover choosing a school and major, applying, moving to an engineering school, coursework, and careers. We connect students with academic resources, mentors, and official advising. Participation in a 3-2 program is not required to join the club, attend talks, or take part in projects.',
  cta: { label: 'Explore what we do', href: '/about#club-activities' },
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
