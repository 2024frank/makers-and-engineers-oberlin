-- Officer portal delete actions. Every function checks the caller's role inside the database,
-- writes an audit_log row, and either cascades or refuses with a stable error code.
-- Not applied automatically: review, then run in the Supabase SQL editor or via the migration runner.

-- 1. Events, news, resources, opportunities, documents, sponsors, leadership and project updates.
-- Projects keep their own typed-title function (delete_project). Admin and Super Admin only.
create or replace function public.delete_content_entity(p_entity_type text,p_entity_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_row jsonb;v_title text;v_updates uuid[];begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'CONTENT_DELETE_FORBIDDEN'; end if;
  if p_entity_type not in ('events','news_posts','resources','opportunities','documents','sponsors','leaders','project_updates') then raise exception 'CONTENT_DELETE_UNSUPPORTED'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_entity_type) into v_row using p_entity_id;
  if v_row is null then raise exception 'CONTENT_NOT_FOUND'; end if;
  v_title := coalesce(v_row->>'title',v_row->>'name','');

  -- Officer positions keep their applications and announcement emails as a record, so they cannot be deleted.
  if p_entity_type='leaders' and (exists(select 1 from public.officer_applications where position_id=p_entity_id)
      or exists(select 1 from public.officer_announcements where position_id=p_entity_id)) then
    raise exception 'OFFICER_POSITION_HAS_HISTORY';
  end if;

  if p_entity_type='opportunities' then delete from public.saved_items where item_type='OPPORTUNITY' and item_id=p_entity_id; end if;
  if p_entity_type='resources' then delete from public.saved_items where item_type='RESOURCE' and item_id=p_entity_id; end if;
  delete from public.content_drafts where entity_type=p_entity_type and entity_id=p_entity_id;
  delete from public.content_versions where entity_type=p_entity_type and entity_id=p_entity_id;
  delete from public.scheduled_publications where processed_at is null and target_id=p_entity_id;

  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(v_admin,'CONTENT_DELETED',p_entity_type,p_entity_id::text,v_row,jsonb_build_object('title',v_title));
  -- Project update reviews cascade from project_updates.
  execute format('delete from public.%I where id=$1',p_entity_type) using p_entity_id;
  return jsonb_build_object('entityType',p_entity_type,'id',p_entity_id,'title',v_title);
end $$;

-- 2. Archived inbox items only. The audit row keeps the type and dates but not the sender's details.
create or replace function public.delete_submission(p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_row public.submissions%rowtype;begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'SUBMISSION_DELETE_FORBIDDEN'; end if;
  select * into v_row from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  if v_row.status<>'archived' then raise exception 'SUBMISSION_NOT_ARCHIVED'; end if;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot)
    values(v_admin,'SUBMISSION_DELETED','submission',p_submission_id::text,jsonb_build_object('type',v_row.type,'status',v_row.status,'createdAt',v_row.created_at));
  delete from public.submissions where id=p_submission_id;
  return jsonb_build_object('id',p_submission_id);
end $$;

-- 3. A club team. Memberships, requests and project links cascade; members are told in their portal.
create or replace function public.admin_delete_club_team(p_team_id uuid,p_confirm_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid := (select auth.uid());v_team public.club_teams%rowtype;v_notified integer;begin
  if v_admin is null or not coalesce(private.is_admin_or_super(),false) then raise exception 'CLUB_TEAM_ADMIN_REQUIRED'; end if;
  select * into v_team from public.club_teams where id=p_team_id for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if lower(trim(coalesce(p_confirm_name,'')))<>lower(trim(v_team.name)) then raise exception 'TEAM_DELETE_CONFIRMATION_MISMATCH'; end if;
  insert into public.member_notifications(user_id,kind,title,body,action_url)
    select m.user_id,'CLUB_TEAM_DELETED','A team was removed','"'||v_team.name||'" was removed by the club officers. Your other teams are unchanged.','/member/teams'
    from public.club_team_memberships m where m.team_id=p_team_id;
  get diagnostics v_notified = row_count;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(v_admin,'CLUB_TEAM_DELETED','club_team',p_team_id::text,to_jsonb(v_team),jsonb_build_object('notifiedMembers',v_notified));
  -- project_proposals.team_id has no cascade; keep the proposal, drop the link to the removed team.
  update public.project_proposals set team_id=null where team_id=p_team_id;
  delete from public.club_teams where id=p_team_id;
  return jsonb_build_object('teamId',p_team_id,'name',v_team.name,'notifiedMembers',v_notified);
end $$;

-- 4. Remove a member. Someone with an account is suspended (their history, teams and applications stay
-- intact for the record, and they lose portal access). A request that never became an account is deleted.
create or replace function public.remove_member(p_request_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role public.admin_role;v_request public.membership_requests%rowtype;v_profile public.member_profiles%rowtype;begin
  select ra.role into v_role from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=p_actor_id and ap.active=true and ap.status='ACTIVE';
  if v_role not in ('ADMIN','SUPER_ADMIN') then raise exception 'MEMBER_REVIEW_FORBIDDEN'; end if;
  select * into v_request from public.membership_requests where id=p_request_id for update;
  if not found then raise exception 'MEMBERSHIP_REQUEST_NOT_FOUND'; end if;
  if v_request.auth_user_id is not null and exists(select 1 from public.admin_profiles where user_id=v_request.auth_user_id and status<>'REVOKED') then
    raise exception 'MEMBER_IS_STAFF';
  end if;
  select * into v_profile from public.member_profiles where membership_request_id=p_request_id for update;
  if found then
    if v_profile.status='SUSPENDED' then raise exception 'MEMBER_ALREADY_REMOVED'; end if;
    update public.member_profiles set status='SUSPENDED',updated_at=now() where user_id=v_profile.user_id;
    update public.membership_requests set status='SUSPENDED',reviewed_by=p_actor_id,reviewed_at=now(),review_note='Removed from the club by an officer',updated_at=now() where id=p_request_id;
    insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
      values(p_actor_id,'MEMBER_REMOVED','member_profile',v_profile.user_id::text,jsonb_build_object('status',v_profile.status,'email',v_request.email),jsonb_build_object('status','SUSPENDED'));
    return jsonb_build_object('request_id',p_request_id,'email',v_request.email,'display_name',v_request.display_name,'outcome','SUSPENDED');
  end if;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot)
    values(p_actor_id,'MEMBERSHIP_REQUEST_DELETED','membership_request',p_request_id::text,jsonb_build_object('status',v_request.status,'email',v_request.email));
  delete from public.membership_requests where id=p_request_id;
  return jsonb_build_object('request_id',p_request_id,'email',v_request.email,'display_name',v_request.display_name,'outcome','DELETED');
end $$;

-- 5. Remove an officer's access. Super Admin only. The profile row stays (revoked) because reviews,
-- invitations and approvals point at it; the person can only return through a new staff invitation.
create or replace function public.remove_staff_access(p_user_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor public.admin_role;v_profile public.admin_profiles%rowtype;v_assignment public.role_assignments%rowtype;begin
  select ra.role into v_actor from public.role_assignments ra join public.admin_profiles ap on ap.user_id=ra.user_id
    where ra.user_id=p_actor_id and ap.active=true and ap.status='ACTIVE';
  if v_actor is distinct from 'SUPER_ADMIN'::public.admin_role then raise exception 'FORBIDDEN'; end if;
  if p_user_id=p_actor_id then raise exception 'CANNOT_REMOVE_SELF'; end if;
  perform pg_advisory_xact_lock(hashtextextended('staff-access-removal',29));
  select * into v_profile from public.admin_profiles where user_id=p_user_id for update;
  if not found or v_profile.status='REVOKED' then raise exception 'ADMIN_USER_NOT_FOUND'; end if;
  select * into v_assignment from public.role_assignments where user_id=p_user_id;
  if v_profile.active and v_profile.status='ACTIVE' and v_assignment.role in ('ADMIN','SUPER_ADMIN') then
    if not exists(select 1 from public.admin_profiles ap join public.role_assignments ra on ra.user_id=ap.user_id
        where ap.user_id<>p_user_id and ap.active=true and ap.status='ACTIVE' and ra.role='SUPER_ADMIN') then
      raise exception 'FINAL_SUPER_ADMIN_REQUIRED';
    end if;
    if not exists(select 1 from public.admin_profiles ap join public.role_assignments ra on ra.user_id=ap.user_id
        where ap.user_id<>p_user_id and ap.active=true and ap.status='ACTIVE' and ra.role in ('ADMIN','SUPER_ADMIN')) then
      raise exception 'FINAL_ADMIN_REQUIRED';
    end if;
  end if;
  update public.admin_profiles set active=false,status='REVOKED' where user_id=p_user_id;
  update public.role_assignments set role='EDITOR',scopes='{}',can_publish=false where user_id=p_user_id;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_snapshot,after_snapshot)
    values(p_actor_id,'STAFF_ACCESS_REMOVED','admin_user',p_user_id::text,
      jsonb_build_object('displayName',v_profile.display_name,'role',v_assignment.role,'scopes',v_assignment.scopes,'canPublish',v_assignment.can_publish,'status',v_profile.status),
      jsonb_build_object('status','REVOKED'));
  return jsonb_build_object('user_id',p_user_id,'status','REVOKED');
end $$;

revoke all on function public.delete_content_entity(text,uuid) from public,anon;
revoke all on function public.delete_submission(uuid) from public,anon;
revoke all on function public.admin_delete_club_team(uuid,text) from public,anon;
revoke all on function public.remove_member(uuid,uuid) from public,anon,authenticated;
revoke all on function public.remove_staff_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_content_entity(text,uuid) to authenticated;
grant execute on function public.delete_submission(uuid) to authenticated;
grant execute on function public.admin_delete_club_team(uuid,text) to authenticated;
grant execute on function public.remove_member(uuid,uuid) to service_role;
grant execute on function public.remove_staff_access(uuid,uuid) to service_role;
