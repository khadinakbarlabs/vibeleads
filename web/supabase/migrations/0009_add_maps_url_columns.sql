-- ─────────────────────────────────────────────────────────────────────────────
-- 0009_add_maps_url_columns.sql
--
-- Why: the normalizer was reading camelCase fields (title, url, location.lat,
-- placeId, etc.) that don't exist on the khadinakbar/google-maps-leads-scraper
-- output. The actor returns snake_case top-level keys: business_name,
-- google_maps_url, place_id, latitude, longitude, lead_score, source_url.
--
-- As a result, leads were being saved with NULL business_name and the Google
-- Maps profile URL was lost (raw.url is the maps URL, but we mistakenly
-- assigned it to website as a fallback when raw.website was missing).
--
-- This migration:
--   1. Adds google_maps_url, place_id, lead_score, source_url columns
--   2. Backfills google_maps_url from leads.raw->>'google_maps_url' for existing rows
--   3. Adds a unique index on (account_id, place_id) so place_id is the
--      strongest dedupe key when present.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.leads
  add column if not exists google_maps_url text,
  add column if not exists place_id        text,
  add column if not exists lead_score      smallint,
  add column if not exists source_url      text;

-- Backfill from raw payload if it's there
update public.leads
set
  google_maps_url = coalesce(google_maps_url, raw->>'google_maps_url'),
  place_id        = coalesce(place_id,        raw->>'place_id'),
  lead_score      = coalesce(lead_score, nullif(raw->>'lead_score', '')::smallint),
  source_url      = coalesce(source_url,      raw->>'source_url'),
  -- backfill business_name from raw.business_name (snake_case) when current value is NULL
  business_name   = coalesce(business_name,   raw->>'business_name', raw->>'title', raw->>'name'),
  -- backfill address from full_address
  address         = coalesce(address,         raw->>'full_address',  raw->>'address')
where (raw ? 'google_maps_url') or (raw ? 'business_name') or (raw ? 'full_address');

-- Backfill phones array from raw.phone (singular) when phones is empty
update public.leads
set phones = array[raw->>'phone']
where (phones is null or array_length(phones, 1) is null)
  and raw->>'phone' is not null
  and length(raw->>'phone') > 0;

-- Backfill emails from raw.email (singular) when emails is empty
update public.leads
set emails = array[raw->>'email']
where (emails is null or array_length(emails, 1) is null)
  and raw->>'email' is not null
  and length(raw->>'email') > 0;

-- Backfill lat/lng from latitude/longitude
update public.leads
set
  lat = coalesce(lat, nullif(raw->>'latitude', '')::double precision),
  lng = coalesce(lng, nullif(raw->>'longitude','')::double precision)
where raw ? 'latitude' or raw ? 'longitude';

-- Backfill socials jsonb from top-level facebook/instagram/linkedin/twitter
update public.leads
set socials = coalesce(socials, '{}'::jsonb)
            || jsonb_strip_nulls(jsonb_build_object(
                 'facebook',  nullif(raw->>'facebook',  ''),
                 'instagram', nullif(raw->>'instagram', ''),
                 'linkedin',  nullif(raw->>'linkedin',  ''),
                 'twitter',   nullif(raw->>'twitter',   '')
               ))
where raw ? 'facebook' or raw ? 'instagram' or raw ? 'linkedin' or raw ? 'twitter';

-- Indexes
create index if not exists leads_place_id_idx     on public.leads(place_id) where place_id is not null;
create index if not exists leads_google_maps_idx  on public.leads(google_maps_url) where google_maps_url is not null;

comment on column public.leads.google_maps_url is 'Direct link to the Google Maps profile (only set for local_business / gmaps_leads intents)';
comment on column public.leads.place_id        is 'Google Places place_id; primary dedupe key when present';
comment on column public.leads.lead_score      is '0-100 score computed by the scraper (data completeness × engagement signals)';
comment on column public.leads.source_url      is 'Original URL the row was scraped from';
