-- Plain-language copy cleanup for text stored in the CMS. Not applied yet.
-- Each replace matches one exact phrase seen on the live site. Quote sections are not touched.
-- Not touched on purpose: seo fields and page titles (no sloppy phrase was seen there).

update public.page_sections
set draft_payload = replace(draft_payload::text, 'Sort out the move', 'Confirm details with the partner school')::jsonb
where draft_payload::text like '%Sort out the move%';

update public.page_versions
set sections_snapshot = replace(sections_snapshot::text, 'Sort out the move', 'Confirm details with the partner school')::jsonb
where sections_snapshot::text like '%Sort out the move%';

update public.page_versions
set page_snapshot = replace(page_snapshot::text, 'Sort out the move', 'Confirm details with the partner school')::jsonb
where page_snapshot::text like '%Sort out the move%';
