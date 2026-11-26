-- ─────────────────────────────────────────────────────────────────────────────
-- 0013_add_hiring_intent.sql
--
-- Adds the `hiring_intent` value to the search_intent enum so the new
-- LinkedIn Jobs scraper can be routed by the AI prompt parser. Closes
-- Slice-4 #1 from the May 2026 use-case research (~6 recruiting plays
-- — UC-25 'Dev-tool SaaS hiring DevRel', UC-31 'US React-engineer
-- hirers', UC-32 'Series B startups hiring VP Sales', UC-33 'Urgent
-- care clinics hiring RNs', UC-34 'NYC junior SWE jobs', UC-35
-- 'Companies w/ 10+ jobs in 60d').
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.search_intent add value if not exists 'hiring_intent';
