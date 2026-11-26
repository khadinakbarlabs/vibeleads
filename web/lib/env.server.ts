/**
 * Server-only environment variables.
 *
 * The `server-only` import throws at build time if a client component
 * accidentally imports this file. Anything secret belongs here.
 */
import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Supabase (service role — never expose). Optional in dev so the app boots
  // without it; required at the moment any admin operation runs (webhook
  // handlers, cron jobs) — adminSupabase() throws a clear error if missing.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Anthropic — optional at parse time so Next's page-data workers don't
  // crash on build (they don't inherit .env.local). The anthropic() factory
  // throws a clear error if it's actually missing at runtime.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_HAIKU: z.string().default("claude-haiku-4-5"),
  ANTHROPIC_MODEL_SONNET: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_OPUS: z.string().default("claude-opus-4-7"),

  // Apify — same reasoning. apify() factory enforces presence at runtime.
  APIFY_TOKEN: z.string().optional(),
  // Required by the callback route at runtime. Optional here so local builds
  // and cron-only development remain possible; production launch code refuses
  // to start public Apify outreach without it.
  APIFY_WEBHOOK_SECRET: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0
        ? undefined
        : value,
    z.string().min(32).optional(),
  ),

  // Apify actor IDs — locked to actors owned by khadinakbar.
  // Per user directive: "only use actors built by me."
  ACTOR_GOOGLE_MAPS_ID: z
    .string()
    .default("khadinakbar/google-maps-leads-scraper"),
  ACTOR_GOOGLE_SERP_ID: z.string().default("khadinakbar/scrape-google-serp"),
  ACTOR_CONTACT_FORM_ID: z
    .string()
    .default("khadinakbar/contact-details-scraper"),
  ACTOR_GMAPS_LEADS_ID: z
    .string()
    .default("khadinakbar/google-maps-leads-scraper"),
  /** LinkedIn jobs scraper — powers the hiring_intent intent. */
  ACTOR_LINKEDIN_JOBS_ID: z
    .string()
    .default("khadinakbar/linkedin-jobs-scraper"),
  /** ProductHunt scraper with embedded email enrichment — powers the producthunt intent. */
  ACTOR_PRODUCTHUNT_ID: z
    .string()
    .default("khadinakbar/producthunt-scraper-pro"),
  /** LinkedIn profile + email scraper — powers the talent_sourcing intent. */
  ACTOR_LINKEDIN_PROFILES_ID: z
    .string()
    .default("khadinakbar/linkedin-profile-email-scraper"),
  /** Google Maps reviews scraper — powers the reviews_gmaps intent (per-place review pulls). */
  ACTOR_GMAPS_REVIEWS_ID: z
    .string()
    .default("khadinakbar/google-maps-reviews-scraper"),
  /** Trustpilot reviews scraper — powers the reviews_trustpilot intent (per-domain review pulls). */
  ACTOR_TRUSTPILOT_REVIEWS_ID: z
    .string()
    .default("khadinakbar/trustpilot-reviews-scraper"),

  /** SerpAPI key required by the contact-form submitter for discovering contact pages. */
  SERPAPI_KEY: z.string().optional(),
  /**
   * Google PageSpeed Insights API key. Free tier is 25k requests/day —
   * enables the 'slow website' / 'PageSpeed score < N' filter family.
   * Get one at https://console.cloud.google.com (enable PSI API).
   */
  PAGESPEED_API_KEY: z.string().optional(),

  // Stripe (optional in dev — billing is Phase 5)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email validation (optional — Phase 3). Provider auto-selected based on
  // which key is set: NeverBounce > ZeroBounce > EmailListVerify > syntax-only.
  NEVERBOUNCE_API_KEY: z.string().optional(),
  ZEROBOUNCE_API_KEY: z.string().optional(),
  EMAILLISTVERIFY_API_KEY: z.string().optional(),

  // Apify enrichment actors (owned by khadinakbar).
  ACTOR_WEBSITE_ENRICH_ID: z
    .string()
    .default("khadinakbar/bulk-website-contact-extractor"),
  ACTOR_COMPANY_ENRICH_ID: z
    .string()
    .default("khadinakbar/universal-lead-finder"),

  // Email send (optional — Phase 6)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("notifications@vibeleads.app"),

  // Cron route protection. Optional at parse time; the cron route refuses
  // requests when no secret is configured.
  CRON_SECRET: z.string().min(16).optional(),

  // ── Cost guards ────────────────────────────────────────────────────────
  //
  // Hard caps that protect the user (and the platform's wallet) from a
  // runaway run. All three are tunables, not hard-coded; raise them via
  // Vercel env if a power user genuinely needs more headroom.
  //
  /** Max wall-clock seconds a single search can run before the poll
   *  auto-aborts it. Default 10 min — way longer than any sensible run.
   *  Maps + email-enrichment runs typically finish in 2-4 min; this is
   *  pure runaway protection. */
  MAX_RUNTIME_SECS: z.coerce.number().int().min(60).default(600),
  /** Per-account daily credit ceiling. Once an account has spent this
   *  many credits in a UTC day, new searches are refused until
   *  midnight. Default 5000 ≈ $5 of spend before the user has to opt
   *  back in. Power users override per-account in `accounts.daily_credit_cap`. */
  DEFAULT_DAILY_CREDIT_CAP: z.coerce.number().int().min(100).default(5000),
  /** Credit threshold above which the IntentPreview shows a "this is a
   *  big run — confirm?" gate before submit. Default 200 ≈ $0.50. */
  PREFLIGHT_CONFIRM_THRESHOLD_CREDITS: z.coerce
    .number()
    .int()
    .min(10)
    .default(200),

  // ── Provider selection ───────────────────────────────────────────────
  //
  /** Google Maps scraper provider. "apify" (default) routes
   *  local_business runs to the Apify actor; "native" uses our
   *  SerpAPI-backed scraper (~70% cheaper, no per-website email
   *  enrichment). Setting `native` does NOT affect gmaps_leads or
   *  other intents — only local_business has a native path so far. */
  MAPS_PROVIDER: z.enum(["apify", "native"]).default("apify"),

  /** Outreach mailbox domain. When set, every submission's email field
   *  uses `outreach+camp<id>@<domain>` (RFC 5233 sub-address) instead of
   *  the user's real reply email — isolates spam blowback per campaign.
   *  The user's real contact still rides along in the message body. */
  OUTREACH_INBOX_DOMAIN: z.string().optional(),
  /** Local-part of the outreach inbox. Defaults to "outreach"; only used
   *  when OUTREACH_INBOX_DOMAIN is also set. */
  OUTREACH_INBOX_BASE: z.string().default("outreach"),

  // 32-byte hex (64 chars) AES-256-GCM master key for encrypting integration
  // credentials at rest. Optional in dev (falls back to plaintext with a
  // warning). Required in production.
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars (32 bytes)")
    .optional(),

  // Observability (optional)
  SENTRY_DSN: z.string().optional(),
});

const parsed = ServerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid server environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid server environment variables");
}

export const serverEnv = parsed.data;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
