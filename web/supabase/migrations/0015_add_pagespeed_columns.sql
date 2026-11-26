-- ─────────────────────────────────────────────────────────────────────────────
-- 0015_add_pagespeed_columns.sql
--
-- Adds Google PageSpeed Insights signals to the leads table so the
-- 'slow website' / 'old-school site' filter family works. The columns
-- are populated by a 4th enrichment step (lib/enrichment/pagespeed.ts)
-- that runs only for leads with a website, gated by PAGESPEED_API_KEY
-- being set in the environment.
--
-- Score interpretation:
--   90-100 = excellent ("A" — fast, modern site)
--   75-89  = good      ("B")
--   50-74  = needs improvement ("C" — agency pitch territory)
--    0-49  = poor      ("D" — slow, often outdated stack)
--
-- LCP and FCP are Core Web Vitals timings in milliseconds. The chrome
-- of "slow website" filter just checks pagespeed_score < threshold.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists pagespeed_score smallint,
  add column if not exists pagespeed_lcp_ms integer,
  add column if not exists pagespeed_fcp_ms integer;

comment on column public.leads.pagespeed_score is 'Google PageSpeed Insights mobile score (0-100). NULL when not enriched.';
comment on column public.leads.pagespeed_lcp_ms is 'Largest Contentful Paint timing in milliseconds (Core Web Vital).';
comment on column public.leads.pagespeed_fcp_ms is 'First Contentful Paint timing in milliseconds (Core Web Vital).';

-- Index for the slow_website post-filter — most queries filter by score.
create index if not exists leads_pagespeed_score_idx
  on public.leads(pagespeed_score)
  where pagespeed_score is not null;
