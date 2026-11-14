import Link from 'next/link'
import type { z } from 'zod'
import type { eventListSchema } from '@/lib/page-builder/schemas/community'
import type { PageRenderContext } from '@/lib/page-builder/types'
import { refreshSeedEvent } from '@/lib/content/publicCopy'
export function EventListSection({section,context}:{section:z.infer<typeof eventListSchema>;context?:PageRenderContext}) {
const items=(context?.events??[]).slice(0,section.limit).map(refreshSeedEvent)
return <section className="cms-section events-section"><div className="shell"><div className="section-heading section-heading--row"><h2>{section.heading}</h2><Link className="text-link" href="/events">All events</Link></div>{items.length?<div className="list-stack">{items.map(e=><article key={String(e.id)}><div><small>{e.start_at?new Date(String(e.start_at)).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}):'Date to be announced'}</small><h3>{String(e.title)}</h3><p>{String(e.location??'')}</p></div><Link className="text-link" href={'/events/'+String(e.slug)}>Details</Link></article>)}</div>:<div className="event-planning"><p>Weekly build nights, workshops, and alumni talks run throughout the semester.</p><div className="event-planning__grid">{[['Build nights','Work on active projects alongside club teammates.'],['Technical workshops','Hands-on sessions in electronics, CAD, fabrication, and code.'],['Alumni conversations','Real advice on engineering degrees, industry roles, and 3-2 paths.']].map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div>}</div></section>
}
