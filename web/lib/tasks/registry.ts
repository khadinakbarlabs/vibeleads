/**
 * Canonical task registry.
 *
 * Every distinct unit of work the platform performs is a TASK. A search
 * is a recipe — an ordered sequence of tasks with quantities. The router
 * picks the recipe; the credit calculator costs it.
 *
 * Each task carries:
 *  - id          : stable string used in credit ledger references
 *  - label       : human-readable name for UI
 *  - actor       : Apify actor id, external service name, or 'internal'
 *  - unit        : what one charge represents (per-result, per-domain, per-event)
 *  - costUsd     : real $ cost we pay upstream per unit
 *  - credits     : what the user pays per unit (weighted to protect margin)
 *  - category    : 'scrape' | 'enrichment' | 'outreach' | 'export' | 'routing' | 'filter'
 *
 * Credit pricing is anchored at $0.04 per credit (our floor sell rate).
 * Each task's credit weight = max(0.5, ceil(costUsd / 0.04 × marginMultiplier)).
 * marginMultiplier is 2.5 for paid services (60% gross margin floor),
 * 1.0 for free services (PageSpeed, libphonenumber), and 0 for filter
 * tasks (free server-side).
 *
 * If you change a price upstream, update costUsd here and re-derive
 * credits. The credit calculator never reads costUsd directly to avoid
 * leaking provider economics into user-facing math.
 */

export type TaskCategory =
  | "routing" // AI prompt parse
  | "scrape" // Apify actor run, per-result charge
  | "outreach" // contact-form submitter per submission
  | "enrichment" // per-lead validate / discover / score
  | "export" // push to a destination
  | "filter"; // free, server-side post-filters

export type TaskUnit =
  | "per_prompt"
  | "per_result"
  | "per_domain"
  | "per_event"
  | "per_email"
  | "per_phone"
  | "per_lead"
  | "per_run";

export interface Task {
  id: string;
  category: TaskCategory;
  label: string;
  description: string;
  /** Apify actor id, external vendor name, or 'internal'. */
  actor: string;
  unit: TaskUnit;
  /** Real upstream cost per unit, in USD. */
  costUsd: number;
  /** Credits we charge per unit (weighted, anchored at $0.04/credit). */
  credits: number;
  /** Whether this task is configured (env keys present). UI surfaces gating. */
  configured: boolean;
  /**
   * Optional setup hint when not configured — used by the IntentPreview's
   * `featureGaps` panel to point users at the missing env key.
   */
  requiresEnv?: string[];
}

/**
 * Helpers to build credit weights from costUsd. Two policies:
 *   - Paid upstream: 2.5× margin multiplier; rounded up to nearest 0.1.
 *   - Free upstream: 1× our infra (Claude tokens, server time) — usually 0.5 credit floor.
 *
 * The exposed `Task.credits` is the authoritative number; these helpers
 * are only documentation-by-formula for future edits.
 *
 * Anchor: $0.04 per credit (sell rate). If we change tiers, update this.
 */
const CREDIT_PRICE_USD = 0.04;
const PAID_MULTIPLIER = 2.5;

/** Round to one decimal place; floor at 0.5 credits. */
function w(costUsd: number, freeService = false): number {
  if (costUsd === 0 && freeService) return 0.5; // free upstream — charge for our infra
  if (costUsd === 0) return 0;
  const raw = (costUsd / CREDIT_PRICE_USD) * PAID_MULTIPLIER;
  return Math.max(0.5, Math.round(raw * 10) / 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configured-status reader. Reads serverEnv but module is pure data — call
// `tasksWithRuntimeStatus()` from a server context to get the runtime flags.
// We keep the static `configured: true` defaults here and override in the
// runtime helper, so this file stays import-safe from client and server.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static base list. The runtime helper flips `configured` based on env keys.
 *
 * Reasoning behind each credit weight is in the comment column —
 * if you tweak a number, update both the cost and the comment.
 */
export const TASKS_BASE: Task[] = [
  // ─── Routing ──────────────────────────────────────────────────────────────
  {
    id: "routing.parse_prompt",
    category: "routing",
    label: "Parse prompt with Claude",
    description:
      "Anthropic Sonnet tool-use call that turns a free-text prompt into an actor + filter chain. System prompt is cached so most calls are mostly cache hits.",
    actor: "anthropic.claude-sonnet",
    unit: "per_prompt",
    costUsd: 0.001, // ~300 input tokens cached + ~200 output
    credits: w(0.001), // ~0.5 credits
    configured: true,
  },

  // ─── Scrape — Local business (Google Maps) ────────────────────────────────
  {
    id: "scrape.gmaps.basic",
    category: "scrape",
    label: "Google Maps scrape (no email)",
    description:
      "Pull places from Google Maps by query + location. Returns name, address, phone, website, rating, reviews, categories, hours. No per-website email enrichment.",
    actor: "khadinakbar/google-maps-leads-scraper",
    unit: "per_result",
    costUsd: 0.0025, // $0.25 / 100
    credits: w(0.0025), // ~0.5 credit
    configured: true,
  },
  {
    id: "scrape.gmaps.with_email",
    category: "scrape",
    label: "Google Maps + per-website email",
    description:
      "Same as above plus a per-website crawl that pulls emails + Facebook / Instagram / LinkedIn / Twitter URLs. Pick when the user explicitly wants owner emails.",
    actor: "khadinakbar/google-maps-leads-scraper",
    unit: "per_result",
    costUsd: 0.005, // $0.50 / 100 (with enrichEmails=true)
    credits: w(0.005), // ~0.5 credit
    configured: true,
  },

  // ─── Scrape — Web SERP ────────────────────────────────────────────────────
  {
    id: "scrape.serp",
    category: "scrape",
    label: "Google web SERP",
    description:
      "Google organic results for a query. Best for SaaS / agencies / niche software where leads live on the open web rather than Google Maps.",
    actor: "khadinakbar/scrape-google-serp",
    unit: "per_result",
    costUsd: 0.0015, // $0.15 / 100
    credits: w(0.0015),
    configured: true,
  },

  // ─── Scrape — Contact-details extractor ───────────────────────────────────
  {
    id: "scrape.contact_details",
    category: "scrape",
    label: "Contact-details crawler",
    description:
      "Crawl /contact, /about, /team, /imprint pages on a list of URLs. Extracts emails, phones, WhatsApp, 14 social platforms. Cloudflare-XOR-decoded.",
    actor: "khadinakbar/contact-details-scraper",
    unit: "per_domain",
    costUsd: 0.003, // $0.30 / 100
    credits: w(0.003),
    configured: true,
  },

  // ─── Scrape — LinkedIn jobs ───────────────────────────────────────────────
  {
    id: "scrape.linkedin_jobs",
    category: "scrape",
    label: "LinkedIn jobs scrape",
    description:
      "Public LinkedIn job postings with seniority, salary, applicant count, top skills. One row per posting; the company is the lead.",
    actor: "khadinakbar/linkedin-jobs-scraper",
    unit: "per_result",
    costUsd: 0.001, // $0.001 per posting
    credits: w(0.001),
    configured: true,
  },

  // ─── Scrape — Product Hunt ────────────────────────────────────────────────
  {
    id: "scrape.producthunt.basic",
    category: "scrape",
    label: "Product Hunt scrape (no email)",
    description:
      "PH launches across leaderboard / search / topic / URLs. Returns product, makers, upvotes, comment count, topics. No email waterfall.",
    actor: "khadinakbar/producthunt-scraper-pro",
    unit: "per_result",
    costUsd: 0.002,
    credits: w(0.002),
    configured: true,
  },
  {
    id: "scrape.producthunt.email_found",
    category: "scrape",
    label: "Product Hunt — email found (Hunter waterfall)",
    description:
      "Per-product Hunter→Snov→scrape email waterfall. Charged only on successful match.",
    actor: "khadinakbar/producthunt-scraper-pro",
    unit: "per_email",
    costUsd: 0.04,
    credits: w(0.04), // ~2.5 credits per email found
    configured: true,
  },

  // ─── Scrape — LinkedIn profiles (talent sourcing) ─────────────────────────
  {
    id: "scrape.linkedin_profile.basic",
    category: "scrape",
    label: "LinkedIn profile scrape (no email)",
    description:
      "Public LinkedIn profile pull — name, headline, current title + company, location, skills, profile URL. Search-mode (by job-title + city) or URL/slug-mode (explicit profiles).",
    actor: "khadinakbar/linkedin-profile-email-scraper",
    unit: "per_result",
    costUsd: 0.02,
    credits: w(0.02), // ~1.25 credits per profile
    configured: true,
  },
  {
    id: "scrape.linkedin_profile.with_email",
    category: "scrape",
    label: "LinkedIn profile scrape (with public email)",
    description:
      "Same profile pull as basic, plus public-email enrichment when the email is visible on the profile. Charged at the higher rate per profile (no separate per-email charge).",
    actor: "khadinakbar/linkedin-profile-email-scraper",
    unit: "per_result",
    costUsd: 0.06,
    credits: w(0.06), // ~3.75 credits per profile
    configured: true,
  },

  // ─── Scrape — Reviews (per-place reputation pulls) ────────────────────────
  {
    id: "scrape.reviews.gmaps",
    category: "scrape",
    label: "Google Maps reviews scrape",
    description:
      "Per-review pull from Google Maps (one place at a time). Returns rating, text, reviewer, date, owner reply, sentiment hint. Quantity = number of reviews fetched, NOT places.",
    actor: "khadinakbar/google-maps-reviews-scraper",
    unit: "per_result",
    costUsd: 0.0003,
    credits: w(0.0003), // floor minimum (0.5 credits)
    configured: true,
  },
  {
    id: "scrape.reviews.trustpilot",
    category: "scrape",
    label: "Trustpilot reviews scrape",
    description:
      "Per-review pull from Trustpilot — rating, text, reviewer, verified status, owner reply, sentiment label. Domain-keyed; covers brands that don't have a Google Maps listing.",
    actor: "khadinakbar/trustpilot-reviews-scraper",
    unit: "per_result",
    costUsd: 0.0025,
    credits: w(0.0025), // ~0.16 credits per review → floor 0.5
    configured: true,
  },

  // ─── Enrichment — Email validation ────────────────────────────────────────
  {
    id: "enrich.email.elv",
    category: "enrichment",
    label: "Email validate — EmailListVerify",
    description:
      "Cheapest validator in the waterfall. Catches bounces + catch-all + role accounts. Auto-refunds on network errors.",
    actor: "EmailListVerify",
    unit: "per_email",
    costUsd: 0.004,
    credits: w(0.004),
    configured: true,
  },
  {
    id: "enrich.email.zb",
    category: "enrichment",
    label: "Email validate — ZeroBounce",
    description:
      "Mid-tier validator. Used when ZeroBounce key is set and EmailListVerify isn't.",
    actor: "ZeroBounce",
    unit: "per_email",
    costUsd: 0.0065,
    credits: w(0.0065),
    configured: true,
  },
  {
    id: "enrich.email.nb",
    category: "enrichment",
    label: "Email validate — NeverBounce",
    description:
      "Most accurate validator. Used when NeverBounce key is set as the primary in serverEnv.",
    actor: "NeverBounce",
    unit: "per_email",
    costUsd: 0.008,
    credits: w(0.008),
    configured: true,
  },
  {
    id: "enrich.phone.libphonenumber",
    category: "enrichment",
    label: "Phone normalize (E.164)",
    description:
      "Convert each phone to E.164 + classify mobile/fixed-line/VoIP. Free (local library, no API).",
    actor: "internal",
    unit: "per_phone",
    costUsd: 0,
    credits: w(0, true), // 0.5 credit (our infra)
    configured: true,
  },
  {
    id: "enrich.socials.scrape",
    category: "enrichment",
    label: "Social profile discovery",
    description:
      "Fetch the lead's website homepage, extract LinkedIn / X / Instagram / Facebook / YouTube / TikTok URLs from <a href>. 8s timeout.",
    actor: "internal",
    unit: "per_lead",
    costUsd: 0.0005, // server CPU + bandwidth approximation
    credits: w(0.0005),
    configured: true,
  },
  {
    id: "enrich.pagespeed",
    category: "enrichment",
    label: "PageSpeed score (Google PSI)",
    description:
      "Mobile Lighthouse score 0-100 + Core Web Vitals (LCP, FCP). Free 25k requests/day with PAGESPEED_API_KEY. Powers the slow-website filter family.",
    actor: "Google PSI",
    unit: "per_lead",
    costUsd: 0,
    credits: w(0, true), // 0.5 credit
    configured: false,
    requiresEnv: ["PAGESPEED_API_KEY"],
  },

  // ─── Export — destinations (push leads) ───────────────────────────────────
  {
    id: "export.csv",
    category: "export",
    label: "CSV export",
    description:
      "Generate RFC-4180 CSV to Supabase Storage, return a presigned download URL. Includes role-account hygiene at export time.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0, // included; CSV is a courtesy
    configured: true,
  },
  {
    id: "export.instantly",
    category: "export",
    label: "Push to Instantly",
    description: "Add leads to an Instantly campaign via API.",
    actor: "Instantly API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.smartlead",
    category: "export",
    label: "Push to Smartlead",
    description: "Drop leads into a Smartlead campaign list.",
    actor: "Smartlead API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.apollo",
    category: "export",
    label: "Push to Apollo",
    description: "Add contacts to an Apollo workspace.",
    actor: "Apollo API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.lemlist",
    category: "export",
    label: "Push to Lemlist",
    description: "Send leads to a Lemlist campaign.",
    actor: "Lemlist API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.reply",
    category: "export",
    label: "Push to Reply.io",
    description: "Push prospects into a Reply.io sequence.",
    actor: "Reply.io API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.mailshake",
    category: "export",
    label: "Push to Mailshake",
    description: "Add recipients to a Mailshake campaign.",
    actor: "Mailshake API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.snov",
    category: "export",
    label: "Push to Snov.io",
    description: "Push prospects to a Snov list.",
    actor: "Snov.io API",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.gmass",
    category: "export",
    label: "Push to GMass",
    description: "Use the CSV exporter and GMass's Gmail spreadsheet flow.",
    actor: "GMass / Gmail",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "export.webhook",
    category: "export",
    label: "Generic webhook",
    description: "POST signed JSON to any URL — Zapier, Make, n8n, custom CRM.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },

  // ─── Filter — server-side, free ───────────────────────────────────────────
  // Filter tasks aren't user-facing in the credit ledger but are in this
  // registry so the IntentPreview can describe what's running. Cost is 0.
  {
    id: "filter.no_website",
    category: "filter",
    label: "Drop leads with a website",
    description: "Server-side post-filter. Free.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "filter.has_email",
    category: "filter",
    label: "Keep only leads with at least one email",
    description: "Server-side post-filter. Free.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "filter.min_rating",
    category: "filter",
    label: "Min Google rating",
    description: "Server-side post-filter on rating ≥ N.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "filter.independent_only",
    category: "filter",
    label: "Independent businesses only",
    description:
      "Drops 60+ known national chains (Marriott, Starbucks, Planet Fitness, etc).",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "filter.slow_website",
    category: "filter",
    label: "Slow website only (PageSpeed < 50)",
    description:
      "Client-side CRM filter. Requires PageSpeed enrichment to have run first.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
  {
    id: "filter.no_socials",
    category: "filter",
    label: "Drop leads with any social presence",
    description: "Server-side post-filter. Free.",
    actor: "internal",
    unit: "per_run",
    costUsd: 0,
    credits: 0,
    configured: true,
  },
];

/** Lookup by id. Returns null when the task doesn't exist. */
export function findTask(id: string): Task | null {
  return TASKS_BASE.find((t) => t.id === id) ?? null;
}

/** Group helper used by the /capabilities/tasks page. */
export function tasksByCategory(
  tasks: Task[] = TASKS_BASE,
): Record<TaskCategory, Task[]> {
  return tasks.reduce<Record<TaskCategory, Task[]>>(
    (acc, t) => {
      (acc[t.category] = acc[t.category] ?? []).push(t);
      return acc;
    },
    {
      routing: [],
      scrape: [],
      outreach: [],
      enrichment: [],
      export: [],
      filter: [],
    },
  );
}

/**
 * Return the registry with the `configured` flag resolved against the live
 * server env. Pure data — does NOT mutate `TASKS_BASE` so client imports of
 * the static list stay deterministic.
 *
 * Server-only because it imports `lib/env.server`.
 */
export async function tasksWithRuntimeStatus(): Promise<Task[]> {
  // Lazy import keeps the module client-importable for type references.
  const { serverEnv } = await import("@/lib/env.server");
  const envOk = (vars?: string[]) =>
    !vars ||
    vars.every((v) => Boolean((serverEnv as Record<string, unknown>)[v]));

  return TASKS_BASE.map((t) => {
    if (!t.requiresEnv) return t;
    return { ...t, configured: envOk(t.requiresEnv) };
  });
}
