-- ─────────────────────────────────────────────────────────────────────────────
-- 0016_add_talent_and_reviews_intents.sql
--
-- Slice 2 + 3: three new search_intent enum values powering two new
-- verticals identified in the actor-gap audit.
--
--   talent_sourcing      — khadinakbar/linkedin-profile-email-scraper.
--                          Closes ~6 unsupported scenarios in section F
--                          (Recruiting / talent sourcing) — the largest
--                          single coverage gap. Search-mode pulls profiles
--                          by job-title / industry / location; URL-mode
--                          pulls explicit profiles. Optional email
--                          enrichment when public on the profile.
--
--   reviews_gmaps        — khadinakbar/google-maps-reviews-scraper.
--                          Per-place review pulls. Powers reputation-
--                          management agency outreach: "find businesses
--                          drowning in 1-star reviews".
--
--   reviews_trustpilot   — khadinakbar/trustpilot-reviews-scraper.
--                          Domain-keyed alternative to gmaps reviews;
--                          covers brands that don't have a Maps listing.
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.search_intent add value if not exists 'talent_sourcing';
alter type public.search_intent add value if not exists 'reviews_gmaps';
alter type public.search_intent add value if not exists 'reviews_trustpilot';
