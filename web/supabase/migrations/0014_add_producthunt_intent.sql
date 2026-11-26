-- ─────────────────────────────────────────────────────────────────────────────
-- 0014_add_producthunt_intent.sql
--
-- Adds the `producthunt` value to the search_intent enum so the new
-- ProductHunt scraper can be routed by the AI prompt parser. Closes
-- another vertical for SaaS founder discovery (UC-21 Series-A AI
-- startups, UC-22 analytics SaaS partner pages, UC-24 Shopify app
-- developers, UC-28 marketing agencies w/ AI homepage).
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.search_intent add value if not exists 'producthunt';
