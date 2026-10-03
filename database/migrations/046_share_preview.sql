-- Link previews should name the club and include makers, not only engineers.
update public.page_drafts set
  seo_title = 'Makers and Engineers @Oberlin',
  seo_description = 'A student club at Oberlin College for makers and engineers. Build projects, come to events, and get help with the 3-2 engineering pathway.'
where seo_title = 'Makers and Engineers @Oberlin | Oberlin College 3-2 Engineering';

update public.page_versions set page_snapshot = page_snapshot || jsonb_build_object(
  'seoTitle', 'Makers and Engineers @Oberlin',
  'seoDescription', 'A student club at Oberlin College for makers and engineers. Build projects, come to events, and get help with the 3-2 engineering pathway.')
where page_snapshot->>'seoTitle' = 'Makers and Engineers @Oberlin | Oberlin College 3-2 Engineering';
