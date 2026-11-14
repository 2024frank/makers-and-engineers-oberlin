-- Private bucket for shared engineering files across project teams (CAD, PDFs, schematics, code archives, and docs).
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 15728640)
on conflict (id) do update
set public = false,
    file_size_limit = 15728640;

drop policy if exists "Admins manage project shared files bucket" on storage.objects;
create policy "Admins manage project shared files bucket"
on storage.objects for all to authenticated
using (bucket_id = 'project-files' and private.is_admin_or_super())
with check (bucket_id = 'project-files' and private.is_admin_or_super());
