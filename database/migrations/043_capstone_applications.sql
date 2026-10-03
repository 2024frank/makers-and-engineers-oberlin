-- Capstone project applications.
-- * One application per active member: area of interest, what they want to
--   work on, an optional company, and a resume.
-- * Resumes live in a private storage bucket at <user_id>/<uuid>.pdf|docx.
--   The applicant and admins can read them; nobody else can.
-- * Members apply, edit and withdraw through capstone_application_action.
--   Admins mark applications reviewed through the same function.

create table public.capstone_applications (
  user_id uuid primary key references public.member_profiles(user_id) on delete cascade,
  area_of_interest text not null check(length(trim(area_of_interest)) between 2 and 200),
  interests text not null check(length(trim(interests)) between 20 and 3000),
  company text not null default '' check(length(company)<=200),
  resume_path text not null check(length(resume_path)<=200),
  resume_name text not null default '' check(length(resume_name)<=200),
  status text not null default 'PENDING' check(status in ('PENDING','REVIEWED','WITHDRAWN')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.capstone_applications enable row level security;
revoke all on public.capstone_applications from public,anon,authenticated;

-- The owner of a resume path, or null when the path is not one we issue.
create or replace function private.capstone_resume_owner(p_name text)
returns uuid language sql immutable set search_path='' as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|docx)$'
    then split_part(p_name,'/',1)::uuid end;
$$;
grant execute on function private.capstone_resume_owner(text) to authenticated;

-- Caps how many files one member can leave in the bucket.
create or replace function private.capstone_upload_open()
returns boolean language sql stable security definer set search_path='' as $$
  select (select count(*) from storage.objects where bucket_id='capstone-resumes'
    and name like (select auth.uid())::text||'/%')<20;
$$;
revoke all on function private.capstone_upload_open() from public,anon;
grant execute on function private.capstone_upload_open() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('capstone-resumes','capstone-resumes',false,4194304,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "capstone resumes readable by owner and admins" on storage.objects;
create policy "capstone resumes readable by owner and admins" on storage.objects for select to authenticated
  using(bucket_id='capstone-resumes' and private.capstone_resume_owner(name) is not null
    and (private.capstone_resume_owner(name)=(select auth.uid()) or private.is_admin_or_super()));
drop policy if exists "members upload own capstone resume" on storage.objects;
create policy "members upload own capstone resume" on storage.objects for insert to authenticated
  with check(bucket_id='capstone-resumes' and private.capstone_resume_owner(name)=(select auth.uid())
    and private.is_active_member() and private.capstone_upload_open());
drop policy if exists "members remove own capstone resume" on storage.objects;
create policy "members remove own capstone resume" on storage.objects for delete to authenticated
  using(bucket_id='capstone-resumes' and private.capstone_resume_owner(name) is not null
    and (private.capstone_resume_owner(name)=(select auth.uid()) or private.is_admin_or_super()));

-- Admins see every application; members see only their own.
create function public.list_capstone_applications() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_admin boolean:=coalesce(private.is_admin_or_super(),false);begin
  if not (private.is_active_member() or v_admin) then raise exception 'ACTIVE_MEMBER_REQUIRED';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('userId',a.user_id,'displayName',m.display_name,'email',m.oberlin_email,
    'areaOfInterest',a.area_of_interest,'interests',a.interests,'company',a.company,'resumePath',a.resume_path,'resumeName',a.resume_name,
    'status',a.status,'submittedAt',a.submitted_at,'reviewedAt',a.reviewed_at) order by a.submitted_at desc)
    from public.capstone_applications a join public.member_profiles m on m.user_id=a.user_id
    where v_admin or a.user_id=(select auth.uid())),'[]'::jsonb);
end $$;

-- Returns the previous resume path on apply so the caller can delete the old file.
create function public.capstone_application_action(p_action text,p_area text default '',p_interests text default '',p_company text default '',
  p_resume_path text default null,p_resume_name text default '',p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_target uuid;v_old public.capstone_applications%rowtype;v_status text;v_previous text;begin
  if p_action='review' then
    if not coalesce(private.is_admin_or_super(),false) then raise exception 'ADMIN_REQUIRED';end if;
    v_target:=p_user_id;
  elsif not private.is_active_member() then raise exception 'ACTIVE_MEMBER_REQUIRED';
  else v_target:=v_user;end if;
  select * into v_old from public.capstone_applications where user_id=v_target for update;
  if p_action='apply' then
    if length(trim(coalesce(p_area,''))) not between 2 and 200 or length(trim(coalesce(p_interests,''))) not between 20 and 3000
      or length(coalesce(p_company,''))>200 or length(coalesce(p_resume_name,''))>200 then raise exception 'APPLICATION_INVALID';end if;
    if p_resume_path is null and v_old.resume_path is null then raise exception 'RESUME_REQUIRED';end if;
    if p_resume_path is not null and (private.capstone_resume_owner(p_resume_path) is distinct from v_user
      or not exists(select 1 from storage.objects where bucket_id='capstone-resumes' and name=p_resume_path)) then raise exception 'RESUME_INVALID';end if;
    v_previous:=case when p_resume_path is not null and v_old.resume_path is distinct from p_resume_path then v_old.resume_path end;
    insert into public.capstone_applications(user_id,area_of_interest,interests,company,resume_path,resume_name)
    values(v_user,trim(p_area),trim(p_interests),trim(coalesce(p_company,'')),coalesce(p_resume_path,v_old.resume_path),
      case when p_resume_path is null then v_old.resume_name else trim(coalesce(p_resume_name,'')) end)
    on conflict(user_id) do update set area_of_interest=excluded.area_of_interest,interests=excluded.interests,company=excluded.company,
      resume_path=excluded.resume_path,resume_name=excluded.resume_name,status='PENDING',reviewed_at=null,reviewed_by=null,submitted_at=now();
    v_status:='PENDING';
  elsif p_action='withdraw' then
    if v_old.status is null or v_old.status<>'PENDING' then raise exception 'APPLICATION_NOT_WITHDRAWABLE';end if;
    update public.capstone_applications set status='WITHDRAWN' where user_id=v_user;
    v_status:='WITHDRAWN';
  elsif p_action='review' then
    if v_old.status is null or v_old.status<>'PENDING' then raise exception 'APPLICATION_NOT_REVIEWABLE';end if;
    update public.capstone_applications set status='REVIEWED',reviewed_at=now(),reviewed_by=v_user where user_id=v_target;
    v_status:='REVIEWED';
  else raise exception 'ACTION_INVALID';end if;
  insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot)
  values(v_user,'CAPSTONE_APPLICATION_'||upper(p_action),'capstone_applications',v_target::text,jsonb_build_object('status',v_status));
  return jsonb_build_object('status',v_status,'previousResume',v_previous);
end $$;

revoke all on function public.list_capstone_applications(),public.capstone_application_action(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.list_capstone_applications(),public.capstone_application_action(text,text,text,text,text,text,uuid) to authenticated;
