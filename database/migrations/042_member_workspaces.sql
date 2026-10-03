-- Member workspaces inside a project team.
--
-- * Once an officer starts a project, each team member gets a personal
--   workspace: a running log of progress notes with photos.
-- * Teammates and club officers can read every workspace on the project. Only
--   the author writes to their own.
-- * Photos live in a private storage bucket at
--   <project id>/<author user id>/<photo id>.jpg and are read through signed URLs.

create table if not exists public.project_work_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null default '' check(length(body)<=4000),
  photo_paths text[] not null default '{}' check(cardinality(photo_paths)<=6),
  created_at timestamptz not null default clock_timestamp(),
  constraint project_work_logs_not_empty check(length(trim(body))>=2 or cardinality(photo_paths)>0)
);
create index if not exists project_work_logs_project_idx on public.project_work_logs(project_id,created_at desc);
create index if not exists project_work_logs_author_idx on public.project_work_logs(author_user_id);

alter table public.project_work_logs enable row level security;
drop policy if exists "project members read work logs" on public.project_work_logs;
create policy "project members read work logs" on public.project_work_logs for select to authenticated
  using(private.is_project_member(project_id) or private.is_admin_or_super());
-- All writes go through the RPCs below.

-- Project id for a well-formed workspace photo path, otherwise null.
create or replace function private.workspace_photo_project(p_name text)
returns uuid language sql immutable set search_path='' as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    then split_part(p_name,'/',1)::uuid end;
$$;
grant execute on function private.workspace_photo_project(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('team-workspace','team-workspace',false,5242880,array['image/jpeg'])
  on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "team reads workspace photos" on storage.objects;
create policy "team reads workspace photos" on storage.objects for select to authenticated
  using(bucket_id='team-workspace' and private.workspace_photo_project(name) is not null
    and (private.is_project_member(private.workspace_photo_project(name)) or private.is_admin_or_super()));
drop policy if exists "members add own workspace photos" on storage.objects;
create policy "members add own workspace photos" on storage.objects for insert to authenticated
  with check(bucket_id='team-workspace' and private.workspace_photo_project(name) is not null
    and split_part(name,'/',2)=(select auth.uid())::text
    and private.is_project_member(private.workspace_photo_project(name)));
drop policy if exists "members remove workspace photos" on storage.objects;
create policy "members remove workspace photos" on storage.objects for delete to authenticated
  using(bucket_id='team-workspace' and private.workspace_photo_project(name) is not null
    and (split_part(name,'/',2)=(select auth.uid())::text
      or private.is_project_lead(private.workspace_photo_project(name))
      or private.is_admin_or_super()));

-- Add an entry to the caller's own workspace. Photos are uploaded first; every
-- path must sit in the caller's own folder for this project.
create or replace function public.add_project_work_log(p_project_id uuid,p_body text,p_photo_paths text[] default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := (select auth.uid());v_name text;v_started timestamptz;v_paths text[] := coalesce(p_photo_paths,'{}');v_path text;v_id uuid;begin
  if v_user is null or not private.is_project_member(p_project_id) then raise exception 'PROJECT_MEMBER_REQUIRED'; end if;
  select started_at into v_started from public.projects where id=p_project_id;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if v_started is null then raise exception 'PROJECT_NOT_STARTED'; end if;
  if length(coalesce(p_body,''))>4000 then raise exception 'WORK_LOG_TOO_LONG'; end if;
  if cardinality(v_paths)>6 then raise exception 'WORK_LOG_TOO_MANY_PHOTOS'; end if;
  if length(trim(coalesce(p_body,'')))<2 and cardinality(v_paths)=0 then raise exception 'WORK_LOG_REQUIRED'; end if;
  foreach v_path in array v_paths loop
    if private.workspace_photo_project(v_path) is distinct from p_project_id or split_part(v_path,'/',2)<>v_user::text then raise exception 'WORK_LOG_PHOTO_INVALID'; end if;
  end loop;
  select display_name into v_name from public.member_profiles where user_id=v_user;
  insert into public.project_work_logs(project_id,author_user_id,author_name,body,photo_paths)
    values(p_project_id,v_user,coalesce(nullif(v_name,''),'Member'),trim(coalesce(p_body,'')),v_paths) returning id into v_id;
  return jsonb_build_object('id',v_id);
end $$;

-- Delete an entry. Returns its photo paths so the server can remove the files.
create or replace function public.delete_project_work_log(p_log_id uuid)
returns text[] language plpgsql security definer set search_path='' as $$
declare v_log public.project_work_logs%rowtype;begin
  select * into v_log from public.project_work_logs where id=p_log_id;
  if not found then raise exception 'WORK_LOG_NOT_FOUND'; end if;
  if not coalesce(v_log.author_user_id=(select auth.uid()) or private.is_project_lead(v_log.project_id) or private.is_admin_or_super(),false) then raise exception 'WORK_LOG_FORBIDDEN'; end if;
  delete from public.project_work_logs where id=p_log_id;
  return v_log.photo_paths;
end $$;

revoke all on function public.add_project_work_log(uuid,text,text[]) from public,anon;
revoke all on function public.delete_project_work_log(uuid) from public,anon;
grant execute on function public.add_project_work_log(uuid,text,text[]) to authenticated;
grant execute on function public.delete_project_work_log(uuid) to authenticated;

notify pgrst, 'reload schema';
