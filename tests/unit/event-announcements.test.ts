import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatEventWhen, newEventEmail } from '@/lib/email/templates'

const sql = readFileSync('database/migrations/049_event_announcements.sql', 'utf8')
const read = (path: string) => readFileSync(path, 'utf8')

describe('new event announcements', () => {
  it('announces each upcoming published event once, to active members, in the portal', () => {
    expect(sql).toContain("publication_state='published' and (start_at is null or start_at>now())")
    expect(sql).toContain('on conflict do nothing;\n  if not found then return')
    expect(sql).toMatch(/insert into public\.member_notifications[\s\S]*'NEW_EVENT'[\s\S]*from public\.member_profiles where status='ACTIVE'/)
  })

  it('treats events that already started as announced and leaves upcoming ones to go out', () => {
    expect(sql).toMatch(/insert into public\.event_announcements\(event_id\)\nselect id from public\.events where publication_state='published' and start_at is not null and start_at<=now\(\)/)
  })

  it('keeps the function server-only', () => {
    expect(sql).toContain('revoke all on function public.announce_published_event(uuid) from public,anon,authenticated;')
    expect(sql).toContain('grant execute on function public.announce_published_event(uuid) to service_role;')
  })

  it('announces from manual and scheduled publishing', () => {
    expect(read('app/api/publish/content/route.ts')).toContain("if(entityType==='events')after(()=>announcePublishedEventSafely(entityId))")
    expect(read('app/api/cron/publish/route.ts')).toContain("if(row.target_type==='events') after(()=>announcePublishedEventSafely(row.target_id))")
  })

  it('formats the time in Oberlin time', () => {
    expect(formatEventWhen('2026-11-30T23:00:00Z', '2026-12-01T00:00:00Z')).toBe('Monday, November 30, 2026, 6:00 PM to 7:00 PM')
    expect(formatEventWhen('2026-11-30T23:00:00Z')).toBe('Monday, November 30, 2026 at 6:00 PM')
    expect(formatEventWhen(null)).toBe('')
  })

  it('emails the event name, time, place, details and link', () => {
    const message = newEventEmail({
      memberName: 'Ada',
      eventTitle: 'General Meeting',
      startAt: '2026-11-30T23:00:00Z',
      endAt: '2026-12-01T00:00:00Z',
      location: 'Mudd basement, Room A023',
      summary: 'Hear what the project teams built this semester.',
      accessDetails: 'Open to all Oberlin students.',
      actionUrl: 'https://example.org/events/general-meeting',
    })
    expect(message.subject).toBe('MEO event: General Meeting (Mon, Nov 30)')
    expect(message.text).toContain('Hi Ada,')
    expect(message.text).toContain('When: Monday, November 30, 2026, 6:00 PM to 7:00 PM')
    expect(message.text).toContain('Where: Mudd basement, Room A023')
    expect(message.text).toContain('Hear what the project teams built this semester.')
    expect(message.text).toContain('Open to all Oberlin students.')
    expect(message.text).toContain('https://example.org/events/general-meeting')
  })

  it('leaves out empty lines when an event has no time or place', () => {
    const message = newEventEmail({ memberName: '', eventTitle: 'Build Night', actionUrl: 'https://example.org/events/build-night' })
    expect(message.subject).toBe('MEO event: Build Night')
    expect(message.text).not.toContain('When:')
    expect(message.text).not.toContain('Where:')
    expect(message.text).toContain('Hi there,')
  })
})
