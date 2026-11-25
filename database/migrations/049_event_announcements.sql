-- Tell every active member when an upcoming event is published.
--
-- * Each event is announced once, the first time it is published. Republishing
--   edits never re-notifies.
-- * Only upcoming events are announced (no start time, or a start time still
--   ahead), so publishing a past event as a record sends nothing.
-- * Every event already on the website when this runs is treated as announced,
--   except upcoming ones with a start time still ahead; those go out the next
--   time an officer publishes them.
-- * The function adds the in-app notice and returns the email recipients; the
--   server sends the emails and records how many were accepted.

create table if not exists public.event_announcements (
  event_id uuid primary key references public.events(id) on delete cascade,
  announced_at timestamptz not null default now(),
  recipients integer not null default 0,
  emails_sent integer
);
alter table public.event_announcements enable row level security;

insert into public.event_announcements(event_id)
select id from public.events where publication_state='published' and (start_at is null or start_at<=now())
on conflict do nothing;

create or replace function public.announce_published_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event record;
  v_recipients jsonb;
begin
  select id,slug,title,coalesce(summary,'') as summary,start_at,end_at,
    coalesce(location,'') as location,coalesce(access_details,'') as access_details
  into v_event
  from public.events
  where id=p_event_id and publication_state='published' and (start_at is null or start_at>now());
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.event_announcements(event_id) values(p_event_id) on conflict do nothing;
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  select user_id,'NEW_EVENT','New event: '||v_event.title,
    coalesce(nullif(trim(v_event.summary),''),'A new event is on the website.'),
    '/events/'||v_event.slug
  from public.member_profiles where status='ACTIVE';

  select coalesce(jsonb_agg(jsonb_build_object('email',oberlin_email,'displayName',display_name)),'[]'::jsonb)
  into v_recipients from public.member_profiles where status='ACTIVE';

  update public.event_announcements set recipients=jsonb_array_length(v_recipients) where event_id=p_event_id;

  return jsonb_build_object('announced',true,'eventId',v_event.id,'slug',v_event.slug,
    'title',v_event.title,'summary',v_event.summary,'startAt',v_event.start_at,'endAt',v_event.end_at,
    'location',v_event.location,'accessDetails',v_event.access_details,'recipients',v_recipients);
end $$;

revoke all on function public.announce_published_event(uuid) from public,anon,authenticated;
grant execute on function public.announce_published_event(uuid) to service_role;
