-- Denormalized submission outcomes for contact-form campaigns.
--
-- The per-business status lives in leads.raw.submission_status, but
-- aggregating it client-side (or via a JSON scan) on every dashboard /
-- campaign-list render doesn't scale. This caches the rollup on the
-- campaign row, written at finalize time.
--
-- Shape: { delivered, blocked, no_form, failed, total }. NULL for
-- non-outreach campaigns and any outreach campaign that predates this
-- column and hasn't re-run (handled by the backfill below).

alter table public.searches
  add column outcome_counts jsonb;

-- Backfill existing contact-form campaigns from their leads' receipts.
update public.searches s
set outcome_counts = sub.counts
from (
  select
    l.search_id,
    jsonb_build_object(
      'delivered', count(*) filter (where l.raw->>'submission_status' = 'success'),
      'blocked',   count(*) filter (where l.raw->>'submission_status' = 'captcha_blocked'),
      'no_form',   count(*) filter (where l.raw->>'submission_status' = 'no_form'),
      'failed',    count(*) filter (where l.raw->>'submission_status' in ('failed', 'error')),
      'total',     count(*)
    ) as counts
  from public.leads l
  group by l.search_id
) sub
where s.id = sub.search_id
  and s.intent = 'contact_form_submit';
