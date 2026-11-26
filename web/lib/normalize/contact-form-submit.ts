/**
 * Normalize a row from khadinakbar/local-biz-contact-outreach (CONTACT
 * FORM SUBMITTER). Each row is a SUBMISSION RECEIPT, not a contact —
 * we project it into the same NormalizedLead shape so the existing CRM
 * table can render it, with the submission status surfaced via
 * `enrichment_meta.submit` and `description`.
 *
 * Verified output shape (per Apify run):
 *   business_name        string
 *   contact_page_url     string
 *   form_found           boolean
 *   form_submitted       boolean
 *   fields_filled        string[]
 *   ai_generated_fields  string[]
 *   submission_status    success/chatbot_sent/unverified/failed/captcha_blocked/no_channel/etc.
 *   error_message        string | null
 *   screenshot_url       string | null
 *   scraped_at           string
 */
import type { NormalizedLead } from "./types";

interface RawSubmissionRow extends Record<string, unknown> {
  business_name?: string;
  contact_page_url?: string;
  form_found?: boolean;
  form_submitted?: boolean;
  fields_filled?: string[];
  ai_generated_fields?: string[];
  submission_status?:
    | "success"
    | "chatbot_sent"
    | "unverified"
    | "failed"
    | "captcha_blocked"
    | "low_relevance"
    | "no_channel"
    | "mailto_extracted"
    | "chatbot_detected"
    | "chatbot_prefilled"
    | "suppressed"
    | "daily_cap_hit"
    | "error";
  error_message?: string | null;
  screenshot_url?: string | null;
  scraped_at?: string;
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizeContactFormSubmit(
  raw: RawSubmissionRow,
): NormalizedLead | null {
  const url =
    typeof raw.contact_page_url === "string" ? raw.contact_page_url : null;
  if (!url) return null;
  const domain = safeHostname(url);

  const status = raw.submission_status ?? "error";
  const oneLine = describeStatus(status, raw);

  return {
    business_name:
      typeof raw.business_name === "string" && raw.business_name.length > 0
        ? raw.business_name
        : domain,
    contact_name: null,
    category: null,
    categories: [],
    address: null,
    city: null,
    region: null,
    country: null,
    postal_code: null,
    lat: null,
    lng: null,
    website: url,
    google_maps_url: null,
    place_id: null,
    lead_score: null,
    source_url: url,
    emails: [],
    phones: [],
    socials: {},
    rating: null,
    review_count: null,
    hours: null,
    description: oneLine,
    raw: raw as Record<string, unknown>,
    dedupe_key: domain ? `submit:${domain}` : `submit-url:${url.slice(0, 200)}`,
  };
}

function describeStatus(
  status: NonNullable<RawSubmissionRow["submission_status"]>,
  raw: RawSubmissionRow,
): string {
  switch (status) {
    case "success":
      return `Submitted successfully · ${(raw.fields_filled ?? []).length} fields filled${
        (raw.ai_generated_fields ?? []).length > 0
          ? ` (${raw.ai_generated_fields!.length} via Claude)`
          : ""
      }.`;
    case "chatbot_sent":
      return "Message sent through chatbot.";
    case "unverified":
      return `Submitted but not verified${raw.error_message ? `: ${raw.error_message}` : "."}`;
    case "failed":
      return `Submission failed${raw.error_message ? `: ${raw.error_message}` : "."}`;
    case "captcha_blocked":
      return raw.error_message ?? "Skipped — form is gated by CAPTCHA.";
    case "mailto_extracted":
      return "No form submitted — email address extracted as fallback.";
    case "chatbot_detected":
      return raw.error_message ?? "Chatbot detected; message was not sent.";
    case "chatbot_prefilled":
      return (
        raw.error_message ?? "Chatbot was prefilled but not verified sent."
      );
    case "low_relevance":
      return raw.error_message ?? "Skipped — low relevance.";
    case "suppressed":
      return raw.error_message ?? "Skipped — suppression list matched.";
    case "daily_cap_hit":
      return raw.error_message ?? "Skipped — daily cap hit.";
    case "no_channel":
      return "No usable contact form, chatbot send, or email address on the page.";
    case "error":
    default:
      return raw.error_message ?? "Unknown error during submission.";
  }
}
