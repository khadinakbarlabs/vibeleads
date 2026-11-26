-- ─────────────────────────────────────────────────────────────────────────────
-- 0010_backfill_more_lead_fields.sql
--
-- 0009 backfilled the obvious columns (business_name, address, lat/lng,
-- google_maps_url, place_id) but left a few populated-only-from-fresh-inserts
-- fields NULL on existing rows: category, review_count, and the city/region
-- /country/postal_code that the new normalizer parses out of full_address.
--
-- This migration restores them for rows we already have so the user's
-- existing search results don't look half-empty.
-- ─────────────────────────────────────────────────────────────────────────────

-- Single-string category from raw.category
update public.leads
set category = raw->>'category'
where category is null
  and raw->>'category' is not null
  and length(raw->>'category') > 0;

-- review_count from raw.review_count (snake) or reviewsCount (camel fallback)
update public.leads
set review_count = coalesce(
      nullif(raw->>'review_count', '')::integer,
      nullif(raw->>'reviewsCount', '')::integer
    )
where review_count is null
  and (raw ? 'review_count' or raw ? 'reviewsCount');

-- opening_hours -> hours
update public.leads
set hours = (raw->'opening_hours')
where hours is null
  and raw ? 'opening_hours';

-- Best-effort city/region/country/postal parse from full_address.
-- Splits on ", " and assumes the canonical Google Maps shape:
--   "<street>, <city>, <state> <zip>, <country>"
-- We only update rows where the structured fields are NULL so we never
-- overwrite values the actor set explicitly.
with parsed as (
  select
    id,
    string_to_array(coalesce(raw->>'full_address', address), ', ') as parts
  from public.leads
  where coalesce(raw->>'full_address', address) is not null
    and (city is null or region is null or country is null)
)
update public.leads l
set
  country = coalesce(l.country, parts[array_length(parts, 1)]),
  city    = coalesce(
              l.city,
              case when array_length(parts, 1) >= 3 then parts[array_length(parts, 1) - 2] end
            ),
  region  = coalesce(
              l.region,
              -- "NY 11211" → strip trailing digits to recover region
              case when array_length(parts, 1) >= 2 then
                regexp_replace(parts[array_length(parts, 1) - 1], '\s*\d[\w\s-]*$', '')
              end
            ),
  postal_code = coalesce(
                  l.postal_code,
                  case when array_length(parts, 1) >= 2 then
                    nullif(
                      (regexp_match(parts[array_length(parts, 1) - 1], '\d[\w\s-]*$'))[1],
                      ''
                    )
                  end
                )
from parsed p
where l.id = p.id;
