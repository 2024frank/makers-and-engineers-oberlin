-- The short form of Makers and Engineers @Oberlin is MEO, not MOE. Fix stored CMS text.
-- Quote text is never changed (keys named quote are skipped), and news bodies are left alone.

create or replace function pg_temp.rename_meo(t text) returns text language sql immutable as $$
  select regexp_replace(t, '\mMOE\M(?![_-])', 'MEO', 'g')
$$;

create or replace function pg_temp.rename_meo_json(j jsonb) returns jsonb language plpgsql immutable as $$
declare out jsonb; k text; v jsonb;
begin
  case jsonb_typeof(j)
    when 'string' then return to_jsonb(pg_temp.rename_meo(j #>> '{}'));
    when 'array' then
      select coalesce(jsonb_agg(pg_temp.rename_meo_json(e) order by i), '[]'::jsonb) into out
      from jsonb_array_elements(j) with ordinality as a(e, i);
      return out;
    when 'object' then
      out := '{}'::jsonb;
      for k, v in select * from jsonb_each(j) loop
        out := out || jsonb_build_object(k, case when lower(k) like '%quote%' then v else pg_temp.rename_meo_json(v) end);
      end loop;
      return out;
    else return j;
  end case;
end $$;

update public.site_settings set value = pg_temp.rename_meo_json(value) where value::text ~ '\mMOE\M';

update public.page_drafts set
  title = pg_temp.rename_meo(title),
  seo_title = pg_temp.rename_meo(seo_title),
  seo_description = pg_temp.rename_meo(seo_description)
where concat_ws(' ', title, seo_title, seo_description) ~ '\mMOE\M';

update public.page_sections set draft_payload = pg_temp.rename_meo_json(draft_payload) where draft_payload::text ~ '\mMOE\M';

update public.page_versions set
  page_snapshot = pg_temp.rename_meo_json(page_snapshot),
  sections_snapshot = pg_temp.rename_meo_json(sections_snapshot)
where page_snapshot::text ~ '\mMOE\M' or sections_snapshot::text ~ '\mMOE\M';

update public.news_posts set title = pg_temp.rename_meo(title) where title ~ '\mMOE\M';
