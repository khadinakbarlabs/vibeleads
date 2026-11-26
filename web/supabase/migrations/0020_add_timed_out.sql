-- The runtime-cap auto-abort (app/api/sync/[searchId]/poll/route.ts) and the
-- cron sweep both write `searches.timed_out = true` to distinguish a
-- machine-triggered timeout from a user cancel. The column was referenced in
-- the generated types (lib/db/types.ts) but never created by a migration, so
-- every timeout UPDATE failed with "column does not exist" — which, in the
-- native branch, meant the same UPDATE that flips status to 'canceled' also
-- failed, leaving runaway batches non-terminal (bleeding browser-minutes +
-- token spend, exactly what the cap exists to stop).
alter table public.searches
  add column if not exists timed_out boolean not null default false;
