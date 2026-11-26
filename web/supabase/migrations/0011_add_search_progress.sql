-- ─────────────────────────────────────────────────────────────────────────────
-- 0011_add_search_progress.sql
--
-- Adds a structured `progress` jsonb column to the searches table so the
-- backend can stream fine-grained status into the live UI (count-ups,
-- per-step badges, latest step text, ETA estimates) over Supabase
-- Realtime UPDATEs.
--
-- Shape (typed in TS as SearchProgress):
--   {
--     phase: "routing" | "scraping" | "normalizing" | "enriching" | "completing",
--     step: string,             -- human-readable current step
--     expected_leads: number,   -- initial estimate (post-filter target)
--     scraped: number,          -- raw rows fetched from the actor so far
--     normalized: number,       -- normalized leads written to the table
--     enriched_phones: number,
--     enriched_emails: number,
--     enriched_socials: number,
--     started_at: timestamptz,
--     updated_at: timestamptz,
--     eta_secs: number          -- best-effort ETA in seconds remaining
--   }
--
-- We keep the shape inside the existing Realtime publication on the
-- searches table — every progress write fires a single UPDATE event.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.searches
  add column if not exists progress jsonb;

comment on column public.searches.progress is
  'Live progress payload streamed to the UI via Realtime UPDATEs. See SearchProgress type.';
