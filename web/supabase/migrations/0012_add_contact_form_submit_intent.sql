-- ─────────────────────────────────────────────────────────────────────────────
-- 0012_add_contact_form_submit_intent.sql
--
-- Adds the new `contact_form_submit` value to the search_intent enum and
-- introduces an `outreach` jsonb column on the searches table for
-- capturing the sender identity + message body that gets passed to
-- khadinakbar/local-biz-contact-outreach.
--
-- Shape (typed in TS as OutreachConfig):
--   {
--     senderName: string,
--     senderEmail: string,
--     senderPhone?: string,
--     senderCompany?: string,
--     senderWebsite?: string,
--     subject: string,
--     message: string,
--     takeScreenshots?: boolean
--   }
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.search_intent add value if not exists 'contact_form_submit';

alter table public.searches
  add column if not exists outreach jsonb;

comment on column public.searches.outreach is
  'Sender identity + outreach message for contact_form_submit intents. See OutreachConfig type.';
