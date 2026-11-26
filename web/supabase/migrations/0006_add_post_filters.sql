-- Post-filters: criteria the user specified that the upstream actor doesn't
-- support natively. We oversample at scrape time and apply these post-hoc.
-- Examples: no_website, no_instagram, has_email.
alter table public.searches add column if not exists post_filters jsonb;
