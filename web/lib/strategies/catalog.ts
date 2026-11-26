/**
 * Strategy catalog — 100+ named recipes that compose leaf tasks based on
 * what the user is asking for.
 *
 * Reading order:
 *   1. The decision function ranks strategies by `priority` and picks the
 *      highest one whose `requires` clause matches the parsed filters.
 *   2. `buildRecipe` composes leaf tasks from `lib/tasks/registry.ts`.
 *   3. Trigger phrases + rationales feed back into the AI router prompt
 *      and the /capabilities/strategies docs.
 *
 * Numbering convention: strategies grouped by surface, prefixed by surface
 * tag. Priorities loosely cluster:
 *     150–199  outreach (highest — explicit user action)
 *     130–149  hiring intent
 *     110–129  PH / SaaS / niche sources
 *     90–109   slow / old / tech-stack signals
 *     70–89    independent-only / niche local-business specifics
 *     50–69    standard local + email
 *     30–49    standard local
 *     10–29    fallbacks
 */
import { serverEnv } from "@/lib/env.server";
import type { Strategy, ParsedFilters } from "./types";
import type { RecipeStep } from "@/lib/tasks/credit-calc";

// ─────────────────────────────────────────────────────────────────────────────
// Recipe builder helpers — keep buildRecipe bodies short and consistent.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTING: RecipeStep = { taskId: "routing.parse_prompt", qty: 1 };
const PHONE_NORM_FOR = (n: number): RecipeStep => ({
  taskId: "enrich.phone.libphonenumber",
  qty: n,
});
const ELV_VALIDATE = (n: number): RecipeStep => ({
  taskId: "enrich.email.elv",
  qty: n,
});
const SOCIAL_DISCOVERY = (n: number): RecipeStep => ({
  taskId: "enrich.socials.scrape",
  qty: n,
});
const PAGESPEED = (n: number): RecipeStep => ({
  taskId: "enrich.pagespeed",
  qty: n,
});

function limitQty(filters: ParsedFilters, defaultLimit = 50): number {
  return Math.max(1, Math.min(1000, filters.limit ?? defaultLimit));
}
/** When post-filters are restrictive, oversample 2-3x at the actor layer. */
function oversample(target: number, restrictive: boolean): number {
  return restrictive ? Math.min(1000, target * 3) : target;
}

function isRestrictive(f: ParsedFilters): boolean {
  return Boolean(
    f.noWebsite ||
    f.hasEmail ||
    f.hasPhone ||
    f.noSocials ||
    f.noInstagram ||
    f.noFacebook ||
    f.noLinkedin ||
    f.independentOnly ||
    f.slowWebsite ||
    (f.minRating != null && f.minRating >= 4) ||
    (f.maxRating != null && f.maxRating <= 4),
  );
}

const ALWAYS_AVAILABLE = () => ({ ready: true as const });

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────────────

export const STRATEGIES: Strategy[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // HIRING INTENT (priority 130–149)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "hiring.linkedin_jobs",
    label: "Companies actively hiring (LinkedIn jobs)",
    rationale:
      "User wants COMPANIES THAT ARE HIRING. We scrape public LinkedIn job postings filtered by role + window + seniority, return one row per posting (the company is the lead).",
    triggers: [
      "hiring",
      "actively hiring",
      "companies hiring X",
      "just posted",
      "X jobs in last N days",
      "Series B startups hiring",
      "recruiting senior engineers",
    ],
    samplePrompt:
      "Series A–B SaaS companies hiring senior engineers in the last 30 days, US-based and remote-friendly.",
    requires: { hiringSignal: true },
    priority: 140,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.linkedin_jobs", qty: limitQty(f, 50) },
    ],
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TALENT SOURCING (priority 130–145)
  //
  // PEOPLE as leads (not companies that are hiring — that's the
  // hiring_intent lane). Closes ~6 unsupported scenarios in section F
  // of the matrix (engineers open to work, designers with Dribbble,
  // etc.). Two strategies — with and without email enrichment —
  // because the actor's pricing tiers ($0.02 vs $0.06) double when
  // includeEmail is on. Always-on email costs the user money they
  // didn't ask for.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "talent.linkedin_with_email",
    label: "LinkedIn talent sourcing + public emails",
    rationale:
      "User wants PEOPLE matching a search (engineers, designers, founders, recruiters) AND wants their public emails for outreach. We hit the LinkedIn profile actor with includeEmail=true (the actor only emits emails when publicly visible — no inbox guessing).",
    triggers: [
      "talent sourcing with emails",
      "find candidates with email",
      "engineers + email",
      "designers contact info",
      "VP Sales emails",
      "CTO emails",
      "founder emails",
    ],
    samplePrompt:
      "Find React engineers in Seattle who recently posted 'open to work' — get their public emails for outreach.",
    requires: { talentSignal: true, hasEmail: true },
    priority: 145,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.linkedin_profile.with_email", qty: limitQty(f, 50) },
    ],
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "talent.linkedin_search",
    label: "LinkedIn talent sourcing (no email enrichment)",
    rationale:
      "User wants PEOPLE matching a search query — engineers, designers, founders, recruiters, candidates open to work — but didn't ask for emails. Cheaper run; profile data only.",
    triggers: [
      "find people who",
      "engineers in [city]",
      "designers with [skill]",
      "open to work",
      "candidates",
      "VP Sales [industry]",
      "CTO [niche]",
      "talent sourcing",
    ],
    samplePrompt:
      "Senior Python developers in Toronto with side projects on GitHub.",
    requires: { talentSignal: true },
    priority: 132,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.linkedin_profile.basic", qty: limitQty(f, 50) },
    ],
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // REVIEWS / REPUTATION (priority 115–125)
  //
  // Per-place / per-domain review pulls. Powers reputation-management
  // agency outreach: "find businesses drowning in 1-star reviews" or
  // "audit Trustpilot reviews for [brand]". These actors return REVIEW
  // rows; the normalizer collapses them into one lead per place with
  // reviews aggregated, so the existing CRM grid renders sensibly.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "reviews.gmaps",
    label: "Google Maps reviews (per-place pull)",
    rationale:
      "User wants REVIEW DATA for a specific list of Google Maps places — reputation audit, sentiment analysis, or finding low-rated businesses to pitch reputation-management services.",
    triggers: [
      "reviews for [place]",
      "Google Maps reviews",
      "pull reviews",
      "reputation audit",
      "sentiment of [business]",
      "businesses with bad reviews",
      "low-rated places",
      "1-star reviews",
    ],
    samplePrompt:
      "Pull all reviews from Joe's Pizza Manhattan and three other top NYC pizza spots — focus on the 1-star reviews.",
    requires: { reviewsAudit: true, source: "google_maps" },
    priority: 122,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.reviews.gmaps", qty: limitQty(f, 100) },
    ],
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "reviews.trustpilot",
    label: "Trustpilot reviews (per-domain pull)",
    rationale:
      "User wants REVIEW DATA for ecommerce / DTC / B2B brands on Trustpilot — covers brands without a Google Maps presence. Useful for competitor reputation audits and finding low-rated SaaS / DTC brands.",
    triggers: [
      "Trustpilot reviews",
      "TrustScore for [brand]",
      "reviews of [company]",
      "reputation on Trustpilot",
      "how is [brand] rated",
    ],
    samplePrompt:
      "Pull Trustpilot reviews for postmarkapp.com — focus on the 1-star and 2-star reviews from the last 6 months.",
    requires: { reviewsAudit: true, source: "trustpilot" },
    priority: 122,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.reviews.trustpilot", qty: limitQty(f, 100) },
    ],
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PRODUCT HUNT (priority 110–129)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ph.with_emails",
    label: "Product Hunt launches + founder emails",
    rationale:
      "User wants founders / makers from Product Hunt with contact emails. We use the PH scraper's built-in Hunter→Snov→scrape email waterfall (only charged on email found).",
    triggers: [
      "Product Hunt founders with emails",
      "PH launches with founder contacts",
      "makers of recently-launched SaaS, with emails",
      "AI startup founders on Product Hunt",
    ],
    samplePrompt:
      "Top AI tools launched on Product Hunt in the last 7 days — give me the founders' emails.",
    requires: { source: "producthunt", hasEmail: true },
    priority: 125,
    buildRecipe: (f) => {
      const max = limitQty(f, 50);
      const emailsFound = Math.floor(max * 0.4); // empirical hit rate
      return [
        ROUTING,
        { taskId: "scrape.producthunt.basic", qty: max },
        { taskId: "scrape.producthunt.email_found", qty: emailsFound },
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "ph.discovery",
    label: "Product Hunt discovery (no email)",
    rationale:
      "User wants Product Hunt launches but doesn't need founder emails. Cheaper — skips the Hunter waterfall.",
    triggers: [
      "top Product Hunt launches",
      "PH leaderboard",
      "AI tools launched this week",
    ],
    samplePrompt:
      "Top 100 Product Hunt launches this month, sorted by upvotes.",
    requires: { source: "producthunt" },
    priority: 115,
    buildRecipe: (f) => [
      ROUTING,
      { taskId: "scrape.producthunt.basic", qty: limitQty(f, 50) },
    ],
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SLOW / OLD-SCHOOL WEBSITE FAMILY (priority 90–109)
  //   Triggered when user explicitly wants outdated/slow sites — agency
  //   pitch territory. We always run PageSpeed enrichment then post-filter.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "redesign.local_slow_with_email",
    label: "Local businesses with slow website + emails (redesign pitch)",
    rationale:
      "Agency wants to pitch a redesign. We grab the local-business with email enrichment, score every website with Google PageSpeed, and post-filter to score < 50.",
    triggers: [
      "businesses with slow-loading websites",
      "old-school websites in [city]",
      "sites that need a redesign",
    ],
    samplePrompt:
      "Dental practices in Austin with slow-loading websites (PageSpeed under 50) — and I want owner emails to pitch a redesign.",
    requires: { slowWebsite: true, hasEmail: true },
    priority: 105,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      const withSite = Math.floor(max * 0.7);
      const emailsFound = Math.floor(max * 0.4);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.with_email", qty: max },
        ELV_VALIDATE(emailsFound),
        SOCIAL_DISCOVERY(withSite),
        PAGESPEED(withSite),
        PHONE_NORM_FOR(max),
      ];
    },
    available: () =>
      serverEnv.PAGESPEED_API_KEY
        ? { ready: true }
        : {
            ready: false,
            reason:
              "Slow-website filter needs PAGESPEED_API_KEY (free Google API, 25k req/day).",
            missingEnv: ["PAGESPEED_API_KEY"],
          },
  },
  {
    id: "redesign.local_slow",
    label: "Local businesses with slow website",
    rationale:
      "Agency pitch where email isn't required — phone-only outreach or in-person follow-up. Cheaper because we skip per-website email scraping.",
    triggers: [
      "local businesses with slow websites",
      "outdated local site",
      "businesses still on WordPress 5.x",
    ],
    samplePrompt:
      "Pizza shops in Manhattan with slow-loading websites — I want phone outreach for a redesign pitch.",
    requires: { slowWebsite: true },
    priority: 95,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      const withSite = Math.floor(max * 0.7);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        SOCIAL_DISCOVERY(withSite),
        PAGESPEED(withSite),
        PHONE_NORM_FOR(max),
      ];
    },
    available: () =>
      serverEnv.PAGESPEED_API_KEY
        ? { ready: true }
        : {
            ready: false,
            reason: "Needs PAGESPEED_API_KEY.",
            missingEnv: ["PAGESPEED_API_KEY"],
          },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INDEPENDENT-ONLY FAMILY (priority 70–89)
  //   Drops 60+ known chains via the independent_only post-filter.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "indie.local_with_email",
    label: "Independent local businesses with emails",
    rationale:
      "User wants only independent / non-chain businesses. We use the chain-blacklist post-filter (60+ brands). Email enrichment runs because user wants contacts.",
    triggers: [
      "independent restaurants in",
      "indie bike shops",
      "boutique hotels not Marriott",
      "non-chain salons",
      "owner-operated cafes",
    ],
    samplePrompt:
      "Independent (non-chain) coffee shops in Brooklyn with owner emails — I run a wholesale coffee bean supplier.",
    requires: { independentOnly: true, hasEmail: true },
    priority: 85,
    buildRecipe: buildLocalBizRecipe(true, true),
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "indie.local",
    label: "Independent local businesses (no email enrichment)",
    rationale:
      "Independent-only filter without per-website email scrape. Use when phone-only outreach is enough.",
    triggers: [
      "indie cafes",
      "independent boutiques",
      "non-chain dentists",
      "local indie shops",
    ],
    samplePrompt:
      "Independent music venues in Austin — phone numbers only, no need for emails.",
    requires: { independentOnly: true },
    priority: 75,
    buildRecipe: buildLocalBizRecipe(false, true),
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // NO-WEBSITE FAMILY (priority 60–79)
  //   "Trades / SMBs without a website" — common SMM agency target. We pick
  //   the basic gmaps actor (no per-website scrape needed) + post-filter.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "no_website.local_high_rating",
    label: "Local businesses without a website + high rating",
    rationale:
      "User wants well-reviewed businesses missing a basic web presence — classic SMM-agency or website-builder pitch. We oversample 3x because no_website is restrictive.",
    triggers: [
      "no website but 4 stars",
      "highly rated but no site",
      "good reviews missing website",
    ],
    samplePrompt:
      "Yoga studios in Brooklyn with no website but 4+ stars on Google — I sell websites to small businesses.",
    requires: { noWebsite: true },
    priority: 78,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "no_website.local",
    label: "Local businesses without a website",
    rationale:
      "Standard 'SMBs without a website' play — the cheapest local-business search because we don't need per-website email scrape.",
    triggers: ["no website", "businesses without a website", "missing website"],
    samplePrompt: "Plumbers in Seattle without a website on Google Maps.",
    requires: { noWebsite: true },
    priority: 65,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EMAIL-REQUIRED LOCAL (priority 50–69)
  //   When the user wants emails but we need to escalate from gmaps_leads
  //   (per-website email scrape) to web SERP + contact-details when results
  //   look thin. For now we always pick gmaps_leads — escalation is a future
  //   slice (see decide.ts).
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "email.local_with_phone",
    label: "Local businesses with email AND phone",
    rationale:
      "User wants both signals. We use gmaps_leads (per-website email crawl), validate emails via EmailListVerify, normalize phones to E.164.",
    triggers: [
      "with emails and phones",
      "owner contact + phone",
      "best contact data",
    ],
    samplePrompt:
      "Coworking spaces in Boston with both manager email and phone — give me the best contact data.",
    requires: { hasEmail: true, hasPhone: true },
    priority: 65,
    buildRecipe: buildLocalBizRecipe(true, false),
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "email.local",
    label: "Local businesses with email contact",
    rationale:
      "Most common gmaps_leads recipe. Per-website email crawl + EmailListVerify validation. Phone normalize is free.",
    triggers: [
      "with emails",
      "owner emails",
      "with email contact",
      "want their emails",
      "contact emails",
    ],
    samplePrompt:
      "Dental practices in Austin TX with sub-4-star reviews and owner emails — I sell reputation management services.",
    requires: { hasEmail: true },
    priority: 55,
    buildRecipe: buildLocalBizRecipe(true, false),
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // NO-SOCIALS FAMILY (priority 40–59)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "no_socials.local",
    label: "Local businesses with no social presence",
    rationale:
      "User wants businesses missing Instagram / Facebook / LinkedIn — typical SMM-agency target. We always run social-discovery enrichment so the post-filter has data to act on.",
    triggers: [
      "no social media accounts",
      "no Instagram presence",
      "without Facebook",
      "no socials",
    ],
    samplePrompt:
      "100 HVAC companies in New York with no social media accounts — I run a social-media agency.",
    requires: { noSocials: true },
    priority: 55,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      const withSite = Math.floor(max * 0.7);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        SOCIAL_DISCOVERY(withSite),
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "no_instagram.local",
    label: "Local businesses with no Instagram (but possibly other socials)",
    rationale:
      "More targeted than 'no socials' — only requires Instagram missing. Standard play for IG-management agencies.",
    triggers: [
      "no Instagram",
      "without an Instagram presence",
      "missing Instagram",
    ],
    samplePrompt:
      "50 yoga studios in Brooklyn that don't have an Instagram presence — I run an IG-management agency.",
    requires: { noInstagram: true },
    priority: 50,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      const withSite = Math.floor(max * 0.7);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        SOCIAL_DISCOVERY(withSite),
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RATING FAMILY (priority 35–54)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "rating.local_high",
    label: "Highly rated local businesses (4+ stars)",
    rationale:
      "Min-rating filter native to the gmaps actor. No oversample needed.",
    triggers: ["4+ stars", "highly rated", "5-star", "top rated"],
    samplePrompt:
      "Wedding photographers in California with 4+ stars on Google.",
    priority: 45,
    requires: { minRating: 4 },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: limit },
        PHONE_NORM_FOR(limit),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "rating.local_low",
    label: "Low-rated local businesses (sub-4-star)",
    rationale:
      "Reputation-management pitch — find businesses with poor reviews. The actor's minRating doesn't help here; we post-filter on max_rating.",
    triggers: [
      "sub-4-star reviews",
      "below 4 stars",
      "businesses with bad reviews",
      "needs reputation help",
    ],
    samplePrompt:
      "Insurance brokers in Texas with sub-3.5-star reviews — I sell reputation-management software.",
    priority: 45,
    requires: { maxRating: 4 },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: max },
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "rating.local_lots_of_reviews",
    label: "Local businesses with high review count",
    rationale:
      "User wants well-established businesses (≥ N reviews). Standard gmaps + min_reviews filter.",
    triggers: ["with 100+ reviews", "popular businesses", "well-reviewed"],
    samplePrompt:
      "Auto repair shops in Chicago with 100+ Google reviews — well-established only.",
    priority: 38,
    requires: { minReviews: 100 },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: limit },
        PHONE_NORM_FOR(limit),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SAAS / WEB-SERP FAMILY (priority 30–56)
  //   The "with emails" variant lives at 56 — just above email.local (55)
  //   so an explicit source=google_serp signal correctly beats the default
  //   local-business-with-email path. The bare SaaS variant stays in the
  //   30s band as a generic SERP fallback.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "saas.indie_with_email",
    label: "Indie SaaS companies with founder emails",
    rationale:
      "User wants SaaS founders / makers — leads live on the open web rather than Maps. We use Google SERP + contact-details extractor for emails. Wins over email.local because source=google_serp is a stronger specificity signal than hasEmail alone.",
    triggers: [
      "indie SaaS companies",
      "B2B SaaS founders",
      "SaaS makers with emails",
      "running on Stripe billing",
    ],
    samplePrompt:
      "Top 30 indie SaaS companies running on Stripe billing — I'm looking for affiliate-program partners.",
    priority: 56,
    requires: { hasEmail: true, source: "google_serp" },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      const max = oversample(limit, true);
      return [
        ROUTING,
        { taskId: "scrape.serp", qty: max },
        { taskId: "scrape.contact_details", qty: max },
        ELV_VALIDATE(Math.floor(max * 0.5)),
        PHONE_NORM_FOR(max),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "saas.indie",
    label: "SaaS companies (web SERP)",
    rationale:
      "SaaS / agencies / niche software discoverable via web search rather than Maps. One row per organic result.",
    triggers: [
      "SaaS companies",
      "indie software",
      "B2B tools for [niche]",
      "top X for Y",
    ],
    samplePrompt:
      "Top 20 B2B analytics SaaS tools for product managers — give me their websites.",
    priority: 35,
    requires: { source: "google_serp" },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      return [
        ROUTING,
        { taskId: "scrape.serp", qty: limit },
        PHONE_NORM_FOR(limit),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CONTACT-DETAILS FROM URL LIST (priority 25–34)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "extract.contact_from_urls",
    label: "Extract contact details from a URL list",
    rationale:
      "User has supplied URLs and wants emails / phones / socials extracted. Pure contact-details actor pass.",
    triggers: [
      "extract contacts from these URLs",
      "scrape emails from these sites",
      "pull contact info from this list",
    ],
    samplePrompt:
      "Pull contact emails and phones from these 200 e-commerce brand homepages.",
    priority: 30,
    requires: { source: "google_serp", hasEmail: true },
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      return [
        ROUTING,
        { taskId: "scrape.contact_details", qty: limit },
        ELV_VALIDATE(Math.floor(limit * 0.6)),
        PHONE_NORM_FOR(limit),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACKS (priority 10–29)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "default_local_with_email",
    label: "Default — local business with email",
    rationale:
      "Catch-all when a category + location + email-need are present but no other strong signal.",
    triggers: [],
    samplePrompt: "50 dental practices in Phoenix with owner emails.",
    priority: 25,
    requires: { hasEmail: true },
    buildRecipe: buildLocalBizRecipe(true, false),
    available: ALWAYS_AVAILABLE,
  },
  {
    id: "default_local_basic",
    label: "Default — local business",
    rationale:
      "Final fallback. Cheapest scrape, no enrichments unless explicitly requested.",
    triggers: [],
    samplePrompt: "Yoga studios in Brooklyn.",
    priority: 10,
    buildRecipe: (f) => {
      const limit = limitQty(f, 50);
      return [
        ROUTING,
        { taskId: "scrape.gmaps.basic", qty: limit },
        PHONE_NORM_FOR(limit),
      ];
    },
    available: ALWAYS_AVAILABLE,
  },
];

/**
 * Most local-business strategies share the same recipe shape — extract a
 * builder so each strategy is one line.
 */
function buildLocalBizRecipe(
  withEmail: boolean,
  restrictiveFilters: boolean,
): (f: ParsedFilters) => RecipeStep[] {
  return (f: ParsedFilters) => {
    const limit = limitQty(f, 50);
    const max = oversample(limit, restrictiveFilters || isRestrictive(f));
    const withSite = Math.floor(max * 0.7);
    const emailsFound = Math.floor(max * 0.4);
    const steps: RecipeStep[] = [
      ROUTING,
      {
        taskId: withEmail ? "scrape.gmaps.with_email" : "scrape.gmaps.basic",
        qty: max,
      },
      PHONE_NORM_FOR(max),
    ];
    if (withEmail) steps.push(ELV_VALIDATE(emailsFound));
    if (withSite > 0) steps.push(SOCIAL_DISCOVERY(withSite));
    return steps;
  };
}
