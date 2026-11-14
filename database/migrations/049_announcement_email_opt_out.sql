-- Members can turn off club announcement email.
--
-- Announcement email is the officer broadcast to a member group, the notice for a
-- newly published project, and the notice for an officer opening. Account email
-- (verification, invitations, sign-in and password links, decisions on applications
-- and proposals, team invitations, project kickoff) is not affected.
--
-- * Everyone starts opted in.
-- * The flag lives on member_profiles and follows that table's existing rules: a
--   member reads their own row, Admin/Super Admin read every row, and there is no
--   direct UPDATE policy. It changes only through the two functions below.
-- * The unsubscribe link in an email carries a signed token instead of a login, so
--   the web server checks the token and calls the service-role function. That link
--   can only turn announcement email off.
-- * A signed-in member turns it off or back on from their profile.
-- * Portal notifications are unchanged. Opted-out members still get them.

alter table public.member_profiles
  add column if not exists announcement_email_opt_out boolean not null default false;
comment on column public.member_profiles.announcement_email_opt_out is
  'True when the member turned off club announcement email. Account email is never affected.';

-- Service role only: used by the signed unsubscribe link, which has no session.
-- Returns false when the member profile no longer exists.
create or replace function public.set_member_announcement_email_opt_out(p_user_id uuid,p_opt_out boolean,p_source text default 'email_link')
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is null or p_opt_out is null then raise exception 'ANNOUNCEMENT_EMAIL_PREFERENCE_INVALID'; end if;
  if not exists(select 1 from public.member_profiles where user_id=p_user_id) then return false; end if;
  update public.member_profiles set announcement_email_opt_out=p_opt_out,updated_at=now()
    where user_id=p_user_id and announcement_email_opt_out is distinct from p_opt_out;
  -- Mail scanners and repeat clicks call this again; record only a real change.
  if found then
    insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
    values(p_user_id,case when p_opt_out then 'ANNOUNCEMENT_EMAIL_OPT_OUT' else 'ANNOUNCEMENT_EMAIL_OPT_IN' end,
      'member_profile',p_user_id::text,
      jsonb_build_object('announcementEmailOptOut',p_opt_out,'source',left(coalesce(p_source,''),40)));
  end if;
  return true;
end $$;

-- Signed-in member: change their own setting from the member portal.
create or replace function public.set_my_announcement_email_opt_out(p_opt_out boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED'; end if;
  return public.set_member_announcement_email_opt_out((select auth.uid()),p_opt_out,'member_settings');
end $$;

revoke all on function public.set_member_announcement_email_opt_out(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.set_member_announcement_email_opt_out(uuid,boolean,text) to service_role;
revoke all on function public.set_my_announcement_email_opt_out(boolean) from public,anon;
grant execute on function public.set_my_announcement_email_opt_out(boolean) to authenticated;

-- Officer openings: do not queue email for members who opted out.
create or replace function private.queue_officer_opening() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.publication_state='published' and new.current and new.open_seat and not new.advisor
    and (new.application_closes_at is null or new.application_closes_at>now()) then
    if not (coalesce(private.can_publish() and private.has_scope('leaders'),false) or coalesce(auth.role(),'')='service_role') then
      raise exception 'PUBLISH_PERMISSION_REQUIRED';
    end if;
    insert into public.officer_announcements(position_id,role_title,term,bio,closes_at)
    values(new.id,new.role_title,new.term,new.bio,new.application_closes_at) on conflict do nothing;
    if found then
      insert into public.officer_email_outbox(position_id,user_id,recipient,display_name)
      select new.id,user_id,lower(trim(oberlin_email)),display_name from public.member_profiles
      where status='ACTIVE' and not announcement_email_opt_out;
    end if;
  end if;
  return new;
end $$;

-- A member can opt out after their email was queued, so the worker checks again when
-- it claims a recipient. It also returns the member id, which the server signs into
-- that recipient's unsubscribe link. The result gains a column, so the function has
-- to be dropped and created again, and its grants restored.
drop function if exists public.claim_officer_email();
create function public.claim_officer_email() returns table(id uuid,"claimToken" uuid,recipient text,"displayName" text,"positionId" uuid,"roleTitle" text,term text,bio text,"closesAt" timestamptz,"userId" uuid)
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_token uuid:=gen_random_uuid();begin
  update public.officer_email_outbox o set status='UNKNOWN',last_error='Delivery needs reconciliation with the email provider.'
  where (o.status='SENDING' or (o.status='FAILED' and o.delivery_uncertain)) and o.first_attempt_at<now()-interval '23 hours';
  update public.officer_email_outbox o set status='SKIPPED',claim_token=null
  where o.status in ('PENDING','FAILED') and not exists(select 1 from public.leaders l join public.member_profiles m on m.user_id=o.user_id
    where l.id=o.position_id and l.publication_state='published' and l.current and l.open_seat and not l.advisor
    and (l.application_closes_at is null or l.application_closes_at>now()) and m.status='ACTIVE' and not m.announcement_email_opt_out);
  select o.id into v_id from public.officer_email_outbox o
    join public.leaders l on l.id=o.position_id join public.member_profiles m on m.user_id=o.user_id
    where ((o.status in ('PENDING','FAILED') and o.next_attempt_at<=now() and o.attempts<5)
      or (o.status='SENDING' and o.claimed_at<now()-interval '5 minutes' and o.first_attempt_at>=now()-interval '23 hours'))
    and l.publication_state='published' and l.current and l.open_seat and not l.advisor
    and (l.application_closes_at is null or l.application_closes_at>now()) and m.status='ACTIVE' and not m.announcement_email_opt_out
    order by o.next_attempt_at,o.id for update of o skip locked limit 1;
  if v_id is null then return;end if;
  update public.officer_email_outbox o set status='SENDING',claim_token=v_token,claimed_at=now(),attempts=o.attempts+1,
    delivery_uncertain=o.delivery_uncertain or o.status='SENDING',
    first_attempt_at=case when o.status in ('PENDING','FAILED') and not o.delivery_uncertain then now() else o.first_attempt_at end where o.id=v_id;
  return query select o.id,o.claim_token,o.recipient,o.display_name,o.position_id,a.role_title,a.term,a.bio,a.closes_at,o.user_id
    from public.officer_email_outbox o join public.officer_announcements a on a.position_id=o.position_id where o.id=v_id;
end $$;
revoke all on function public.claim_officer_email() from public,anon,authenticated;
grant execute on function public.claim_officer_email() to service_role;

-- New projects: every active member still gets the portal notice. Email goes only to
-- members who have not opted out, and each recipient now carries the member id for
-- their unsubscribe link.
create or replace function public.announce_published_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project record;
  v_recipients jsonb;
begin
  select id,slug,title,coalesce(summary,'') as summary into v_project
  from public.projects where id=p_project_id and publication_state='published';
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.project_announcements(project_id) values(p_project_id) on conflict do nothing;
  if not found then return jsonb_build_object('announced',false); end if;

  insert into public.member_notifications(user_id,kind,title,body,action_url)
  select user_id,'NEW_PROJECT','New project: '||v_project.title,
    coalesce(nullif(trim(v_project.summary),''),'A new project is now on the website.'),
    '/projects/'||v_project.slug
  from public.member_profiles where status='ACTIVE';

  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'email',oberlin_email,'displayName',display_name)),'[]'::jsonb)
  into v_recipients from public.member_profiles where status='ACTIVE' and not announcement_email_opt_out;

  update public.project_announcements set recipients=jsonb_array_length(v_recipients) where project_id=p_project_id;

  return jsonb_build_object('announced',true,'projectId',v_project.id,'slug',v_project.slug,
    'title',v_project.title,'summary',v_project.summary,'recipients',v_recipients);
end $$;

revoke all on function public.announce_published_project(uuid) from public,anon,authenticated;
grant execute on function public.announce_published_project(uuid) to service_role;

notify pgrst,'reload schema';
