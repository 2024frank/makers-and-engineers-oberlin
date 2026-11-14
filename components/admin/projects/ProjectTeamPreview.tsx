import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export type ProjectRosterPerson = { displayName: string; role: 'LEAD' | 'MEMBER' }

const SHOWN = 4

/** The people on one project, shown on its row in the officer Projects list. */
export function ProjectTeamPreview({ people, href }: { people: ProjectRosterPerson[]; href: string }) {
  const shown = people.slice(0, SHOWN)
  const more = people.length - shown.length
  return (
    <div className="manager-team">
      {people.length ? (
        <ul aria-label="Team">
          {shown.map((person, index) => (
            <li key={`${person.displayName}-${index}`}>
              <span className={`manager-team__avatar${person.role === 'LEAD' ? ' is-lead' : ''}`} aria-hidden="true">
                {person.displayName.trim().slice(0, 1).toUpperCase() || '?'}
              </span>
              {person.displayName}
              {person.role === 'LEAD' && <em className="manager-team__lead">Lead</em>}
            </li>
          ))}
          {more > 0 && <li className="manager-team__more">+{more} more</li>}
        </ul>
      ) : (
        <p className="manager-team__empty">No one on the team yet</p>
      )}
      <Link className="manager-team__link" href={href}>
        Manage team <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  )
}
