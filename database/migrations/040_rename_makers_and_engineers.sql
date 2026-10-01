-- Rename the club in stored CMS text: "Oberlin Engineering Club" becomes "Makers and Engineers @Oberlin", and the short form OEC becomes MOE.
-- Quote text is never changed (keys named quote are skipped), and news bodies are left alone.

create or replace function pg_temp.rename_club(t text) returns text language sql immutable as $$
  select regexp_replace(
    replace(replace(t, 'the Oberlin Engineering Club', 'Makers and Engineers @Oberlin'), 'Oberlin Engineering Club', 'Makers and Engineers @Oberlin'),
    '\mOEC\M(?![_-])', 'MOE', 'g')
$$;

create or replace function pg_temp.rename_club_json(j jsonb) returns jsonb language plpgsql immutable as $$
declare out jsonb; k text; v jsonb;
begin
  case jsonb_typeof(j)
    when 'string' then return to_jsonb(pg_temp.rename_club(j #>> '{}'));
    when 'array' then
      select coalesce(jsonb_agg(pg_temp.rename_club_json(e) order by i), '[]'::jsonb) into out
      from jsonb_array_elements(j) with ordinality as a(e, i);
      return out;
    when 'object' then
      out := '{}'::jsonb;
      for k, v in select * from jsonb_each(j) loop
        out := out || jsonb_build_object(k, case when lower(k) like '%quote%' then v else pg_temp.rename_club_json(v) end);
      end loop;
      return out;
    else return j;
  end case;
end $$;

update public.site_settings set value = pg_temp.rename_club_json(value) where value::text ~ 'Oberlin Engineering Club|\mOEC\M';

update public.page_drafts set
  title = pg_temp.rename_club(title),
  seo_title = pg_temp.rename_club(seo_title),
  seo_description = pg_temp.rename_club(seo_description)
where concat_ws(' ', title, seo_title, seo_description) ~ 'Oberlin Engineering Club|\mOEC\M';

update public.page_sections set draft_payload = pg_temp.rename_club_json(draft_payload) where draft_payload::text ~ 'Oberlin Engineering Club|\mOEC\M';

update public.page_versions set
  page_snapshot = pg_temp.rename_club_json(page_snapshot),
  sections_snapshot = pg_temp.rename_club_json(sections_snapshot)
where page_snapshot::text ~ 'Oberlin Engineering Club|\mOEC\M' or sections_snapshot::text ~ 'Oberlin Engineering Club|\mOEC\M';

update public.news_posts set author = 'Makers and Engineers @Oberlin' where author = 'Oberlin Engineering Club';

-- Functions created by 024 and 027 fall back to 'OEC member' as a display name. Redefine them with 'Member'.
do $$
declare r record;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private') and p.prosrc like '%''OEC member''%'
  loop
    execute replace(pg_get_functiondef(r.oid), '''OEC member''', '''Member''');
  end loop;
end $$;

update public.project_team_posts set author_name = 'Member' where author_name = 'OEC member';

update public.news_posts set title = regexp_replace(title, '\mOEC\M(?![_-])', 'MOE', 'g') where title ~ '\mOEC\M';

-- New club inbox.
update public.site_settings set value = jsonb_set(value, '{email}', '"makers.engineers@oberlin.edu"') where key = 'contact' and value->>'email' = 'oberlinengineeringclub@oberlin.edu';
