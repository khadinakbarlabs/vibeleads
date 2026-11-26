-- Per-lead enrichment provenance: tracks which provider gave us each
-- piece of data (email validator name, social discovery source, etc.).
-- Powers the source-transparency UI in the lead drawer.
alter table public.leads add column if not exists enrichment_meta jsonb not null default '{}'::jsonb;
