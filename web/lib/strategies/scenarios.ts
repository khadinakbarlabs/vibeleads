/**
 * 100-prompt scenario matrix — encoded from docs/strategy/SCENARIO_MATRIX.md.
 *
 * Each entry is one realistic user prompt with the actor it should route
 * to, server-side filters applied, support status, and the section heading
 * the prompt belongs to.
 *
 * Why duplicate the markdown into TS:
 *  - The /capabilities/scenarios page renders this directly with grouping
 *    + a coverage roll-up.
 *  - Future integration tests can iterate over these and assert that the
 *    AI router + decide() routes each to the expected strategy.
 *
 * When the markdown changes, update both — they're treated as a single
 * source synchronized by hand. Keeping the structured copy here means the
 * page never has to parse markdown at request time.
 */

export type ScenarioStatus = "supported" | "partial" | "unsupported";

export type ScenarioSection =
  | "A — Local business (Google Maps)"
  | "B — Local needs new API key"
  | "C — SaaS / B2B tech (web SERP + Product Hunt)"
  | "D — Hiring intent (LinkedIn jobs)"
  | "E — Outreach (contact-form auto-submit)"
  | "F — Recruiting / talent sourcing"
  | "G — PR / media outreach"
  | "H — E-commerce / DTC partnerships"
  | "I — Investor / fundraising / accelerator"
  | "J — Niche / vertical-specific";

export interface Scenario {
  /** 1-indexed serial number, matches the matrix doc. */
  n: number;
  /** Section title. */
  section: ScenarioSection;
  /** The user-facing prompt text — the actual phrase you'd paste into /search/new. */
  prompt: string;
  /** Routed actor intent ("—" when unsupported). */
  actor: string;
  /** Server-side filters applied at scrape time. */
  filters: string;
  /** Support status. */
  status: ScenarioStatus;
  /** Optional note explaining a partial / unsupported status. */
  note?: string;
}

export const SCENARIOS: Scenario[] = [
  // ─── A — Local business (Google Maps) ────────────────────────────────────
  {
    n: 1,
    section: "A — Local business (Google Maps)",
    prompt: "50 gyms in Islamabad with 4+ stars and no website",
    actor: "local_business",
    filters: "min_rating=4, no_website, limit=50",
    status: "supported",
  },
  {
    n: 2,
    section: "A — Local business (Google Maps)",
    prompt:
      "Find me 50 gyms in California with no website but 4-star reviews — I want emails too",
    actor: "gmaps_leads",
    filters: "min_rating=4, no_website, has_email",
    status: "supported",
  },
  {
    n: 3,
    section: "A — Local business (Google Maps)",
    prompt: "100 HVAC companies in New York with no social media accounts",
    actor: "local_business",
    filters: "no_socials, limit=100",
    status: "supported",
  },
  {
    n: 4,
    section: "A — Local business (Google Maps)",
    prompt:
      "50 businesses on Google My Business with no website + I want emails",
    actor: "gmaps_leads",
    filters: "no_website, has_email, limit=50",
    status: "supported",
  },
  {
    n: 5,
    section: "A — Local business (Google Maps)",
    prompt: "Dental practices in Austin TX with sub-4-star reviews",
    actor: "gmaps_leads",
    filters: "max_rating=4",
    status: "supported",
  },
  {
    n: 6,
    section: "A — Local business (Google Maps)",
    prompt: "Yoga studios in Brooklyn that don't have an Instagram presence",
    actor: "local_business",
    filters: "no_instagram",
    status: "supported",
  },
  {
    n: 7,
    section: "A — Local business (Google Maps)",
    prompt:
      "Independent restaurants (not chains) in Brooklyn with owner emails",
    actor: "gmaps_leads",
    filters: "independent_only, has_email",
    status: "supported",
  },
  {
    n: 8,
    section: "A — Local business (Google Maps)",
    prompt:
      "Boutique hotels (no Marriott/Hilton/Hyatt) in Miami with GM contact",
    actor: "gmaps_leads",
    filters: "independent_only, has_email",
    status: "supported",
  },
  {
    n: 9,
    section: "A — Local business (Google Maps)",
    prompt: "Indie bike shops in California with contact emails",
    actor: "gmaps_leads",
    filters: "independent_only, has_email",
    status: "supported",
  },
  {
    n: 10,
    section: "A — Local business (Google Maps)",
    prompt: "Coworking spaces in Boston with manager emails",
    actor: "gmaps_leads",
    filters: "has_email",
    status: "supported",
  },
  {
    n: 11,
    section: "A — Local business (Google Maps)",
    prompt: "Pool maintenance companies across Arizona and Nevada",
    actor: "local_business",
    filters: "multi-state location",
    status: "supported",
  },
  {
    n: 12,
    section: "A — Local business (Google Maps)",
    prompt:
      "Auto detail shops in Houston with under 50 reviews — they're underserved",
    actor: "local_business",
    filters: "max_reviews=50",
    status: "supported",
  },
  {
    n: 13,
    section: "A — Local business (Google Maps)",
    prompt: "Wedding venues in NY state with email + Instagram",
    actor: "gmaps_leads",
    filters: "has_email",
    status: "supported",
  },
  {
    n: 14,
    section: "A — Local business (Google Maps)",
    prompt:
      "Roofing companies in Texas with websites + validated emails + Facebook page",
    actor: "gmaps_leads",
    filters: "has_website, has_email",
    status: "supported",
  },
  {
    n: 15,
    section: "A — Local business (Google Maps)",
    prompt: "Pest-control companies in the southeast US with phones + emails",
    actor: "gmaps_leads",
    filters: "has_email, has_phone",
    status: "supported",
  },
  {
    n: 16,
    section: "A — Local business (Google Maps)",
    prompt: "Plumbers in Seattle with no website, on Google Maps",
    actor: "local_business",
    filters: "no_website",
    status: "supported",
  },
  {
    n: 17,
    section: "A — Local business (Google Maps)",
    prompt: "Photographers in San Diego with Instagram + 4.5+ stars",
    actor: "gmaps_leads",
    filters: "min_rating=4.5",
    status: "partial",
    note: "no has_instagram filter — derive from socials at post-filter",
  },
  {
    n: 18,
    section: "A — Local business (Google Maps)",
    prompt:
      "Fitness studios in LA with sub-100 reviews — looking for newer ones",
    actor: "local_business",
    filters: "max_reviews=100",
    status: "supported",
  },
  {
    n: 19,
    section: "A — Local business (Google Maps)",
    prompt: "Crossfit gyms in Texas with no Instagram or Facebook",
    actor: "local_business",
    filters: "no_instagram, no_facebook",
    status: "supported",
  },
  {
    n: 20,
    section: "A — Local business (Google Maps)",
    prompt: "Med spas in Arizona with owner names",
    actor: "gmaps_leads",
    filters: "has_email",
    status: "partial",
    note: "owner-name extraction needs deep website scrape",
  },
  {
    n: 21,
    section: "A — Local business (Google Maps)",
    prompt: "Solar installers in Florida with 4+ stars + email contact",
    actor: "gmaps_leads",
    filters: "min_rating=4, has_email",
    status: "supported",
  },
  {
    n: 22,
    section: "A — Local business (Google Maps)",
    prompt: "Tattoo parlors in Brooklyn with Instagram presence",
    actor: "local_business",
    filters: "post-filter has_instagram",
    status: "partial",
  },
  {
    n: 23,
    section: "A — Local business (Google Maps)",
    prompt: "Vegan restaurants in Portland with no Instagram",
    actor: "local_business",
    filters: "no_instagram",
    status: "supported",
  },
  {
    n: 24,
    section: "A — Local business (Google Maps)",
    prompt: "Recently opened cafes in Austin (last 6 months)",
    actor: "local_business",
    filters: "max_review_count proxy",
    status: "unsupported",
    note: "needs review-history actor enhancement",
  },
  {
    n: 25,
    section: "A — Local business (Google Maps)",
    prompt: "Plumbers in LA with empty Google business profiles (no photos)",
    actor: "local_business",
    filters: "no photo_count filter",
    status: "unsupported",
    note: "needs actor to surface photo_count",
  },

  // ─── B — Local needs new API key ─────────────────────────────────────────
  {
    n: 26,
    section: "B — Local needs new API key",
    prompt:
      "Pizza shops in Manhattan with slow-loading websites (PageSpeed score < 50)",
    actor: "gmaps_leads + PSI",
    filters: "PageSpeed < 50",
    status: "supported",
    note: "PAGESPEED_API_KEY now wired (free, 25k/day)",
  },
  {
    n: 27,
    section: "B — Local needs new API key",
    prompt:
      "Dentists in Phoenix with old-school websites (no SSL, table-based layout, jQuery 1.x)",
    actor: "gmaps_leads + BuiltWith",
    filters: "tech-stack proxy",
    status: "unsupported",
    note: "needs BUILTWITH_API_KEY",
  },
  {
    n: 28,
    section: "B — Local needs new API key",
    prompt: "Restaurants in Miami still on WordPress 5.x or older",
    actor: "gmaps_leads + BuiltWith",
    filters: "CMS=wordpress, version<6",
    status: "unsupported",
  },
  {
    n: 29,
    section: "B — Local needs new API key",
    prompt: "Local businesses in Austin without HTTPS on their website",
    actor: "gmaps_leads + URL probe",
    filters: "https=false",
    status: "partial",
    note: "we can probe website URL during enrichment",
  },
  {
    n: 30,
    section: "B — Local needs new API key",
    prompt: "Shops in San Diego using outdated Stripe / payment integrations",
    actor: "gmaps_leads + BuiltWith",
    filters: "payment-stack version",
    status: "unsupported",
  },

  // ─── C — SaaS / B2B tech (web SERP + Product Hunt) ───────────────────────
  {
    n: 31,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Top 30 indie SaaS companies running on Stripe billing",
    actor: "web_serp",
    filters: "has_email",
    status: "partial",
    note: "Stripe-specific tech detection needs BuiltWith",
  },
  {
    n: 32,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt:
      "AI startups launched on Product Hunt in last 7 days with founder emails",
    actor: "producthunt",
    filters: "topic=ai, lookbackDays=7, has_email",
    status: "supported",
  },
  {
    n: 33,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Top 100 Product Hunt launches this month, sorted by upvotes",
    actor: "producthunt",
    filters: "leaderboard=monthly",
    status: "supported",
  },
  {
    n: 34,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "B2B SaaS founders running affiliate programs",
    actor: "web_serp + contact_form",
    filters: "has_email",
    status: "partial",
    note: "partner-page detection needs page-pattern matching",
  },
  {
    n: 35,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Indie SaaS companies in the analytics space with 11-50 employees",
    actor: "web_serp",
    filters: "size_band=11-50",
    status: "unsupported",
    note: "size band needs Apollo/Clearbit firmographic enrichment",
  },
  {
    n: 36,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Shopify apps with 100+ reviews — give me the founders",
    actor: "web_serp",
    filters: "min_reviews=100",
    status: "partial",
    note: "specialized App Store actor would be cleaner",
  },
  {
    n: 37,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Top 50 indie SaaS makers in Substack writers list",
    actor: "—",
    filters: "—",
    status: "unsupported",
    note: "no Substack scrape today",
  },
  {
    n: 38,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Dev-tool SaaS companies with public pricing pages",
    actor: "web_serp + contact_form",
    filters: "has_email",
    status: "supported",
  },
  {
    n: 39,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "SaaS founders with $500k–$5M ARR in the productivity space",
    actor: "producthunt + ARR proxy",
    filters: "—",
    status: "partial",
    note: "ARR proxy = team page headcount, hiring velocity",
  },
  {
    n: 40,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt:
      "Marketing agencies with 5–30 employees that mention 'AI' on their homepage",
    actor: "web_serp + homepage scan",
    filters: "size_band=5-30, keyword=ai",
    status: "partial",
    note: "homepage keyword scan needs new module",
  },
  {
    n: 41,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "B2B fintech startups in NY/SF — give me head of compliance",
    actor: "web_serp + decision-maker",
    filters: "compliance officer lookup",
    status: "unsupported",
    note: "needs Apollo or LinkedIn-profile-email actor",
  },
  {
    n: 42,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "CPA firms in California with 2–10 partners",
    actor: "gmaps_leads + partner-count",
    filters: "size_band=2-10",
    status: "partial",
    note: "partner-count proxy needs team page scrape",
  },
  {
    n: 43,
    section: "C — SaaS / B2B tech (web SERP + Product Hunt)",
    prompt: "Indie productivity SaaS founders with public Twitter accounts",
    actor: "producthunt",
    filters: "enrichEmails=true",
    status: "supported",
  },

  // ─── D — Hiring intent (LinkedIn jobs) ──────────────────────────────────
  {
    n: 44,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Series A–B SaaS hiring senior engineers in last 30 days",
    actor: "hiring_intent",
    filters: "datePosted=r2592000, experienceLevel=4",
    status: "supported",
  },
  {
    n: 45,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt:
      "Companies in the US hiring senior React engineers in last 14 days, remote-friendly",
    actor: "hiring_intent",
    filters: "datePosted=r604800, experienceLevel=4, workType=2,3",
    status: "supported",
  },
  {
    n: 46,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Series B startups hiring VP of Sales right now",
    actor: "hiring_intent",
    filters: "experienceLevel=5",
    status: "partial",
    note: "Series B detection needs Crunchbase",
  },
  {
    n: 47,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Urgent care clinics in Florida hiring RNs",
    actor: "hiring_intent",
    filters: 'searchQueries=["RN"], locations=["Florida"]',
    status: "supported",
  },
  {
    n: 48,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "NYC junior software engineer roles, last 30 days",
    actor: "hiring_intent",
    filters: "datePosted=r2592000, experienceLevel=2",
    status: "supported",
  },
  {
    n: 49,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Companies that posted 10+ DevRel jobs in the last 60 days",
    actor: "hiring_intent",
    filters: "post-filter group by company",
    status: "partial",
    note: "need group-by-company step in normalizer",
  },
  {
    n: 50,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Tech companies hiring designers in Berlin or London",
    actor: "hiring_intent",
    filters: 'locations=["Berlin","London"], jobType=F',
    status: "supported",
  },
  {
    n: 51,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Companies posting AI/ML roles with $200k+ salary band",
    actor: "hiring_intent",
    filters: 'salaryBase="200000"',
    status: "supported",
    note: "salaryBase enum top is 120k — extend if needed",
  },
  {
    n: 52,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Crypto companies hiring growth marketers in 2026",
    actor: "hiring_intent",
    filters: 'searchQueries=["growth","marketing"]',
    status: "partial",
    note: "industry filter is keyword-based",
  },
  {
    n: 53,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Healthtech startups hiring CTO",
    actor: "hiring_intent",
    filters: 'searchQueries=["CTO"], experienceLevel=6',
    status: "supported",
  },
  {
    n: 54,
    section: "D — Hiring intent (LinkedIn jobs)",
    prompt: "Companies in Pakistan hiring engineers for hybrid work",
    actor: "hiring_intent",
    filters: 'locations=["Pakistan"], workType=3',
    status: "supported",
  },

  // ─── E — Outreach ───────────────────────────────────────────────────────
  {
    n: 55,
    section: "E — Outreach (contact-form auto-submit)",
    prompt:
      "Submit partnership inquiry to every orthodontist clinic in California",
    actor: "contact_form_submit",
    filters: "businessType=orthodontist, location=California",
    status: "supported",
    note: "needs SERPAPI_KEY",
  },
  {
    n: 56,
    section: "E — Outreach (contact-form auto-submit)",
    prompt: "Auto-fill the contact form on every yoga studio in San Diego",
    actor: "contact_form_submit",
    filters: "businessType=yoga studio, location=San Diego",
    status: "supported",
  },
  {
    n: 57,
    section: "E — Outreach (contact-form auto-submit)",
    prompt: "Press inquiry to crypto news outlets in English",
    actor: "contact_form_submit",
    filters: "searchQuery=crypto news english",
    status: "supported",
  },
  {
    n: 58,
    section: "E — Outreach (contact-form auto-submit)",
    prompt:
      "Submit logistics partnership inquiry to UK Shopify brands with intl shipping",
    actor: "contact_form_submit",
    filters: "businessType=Shopify brand, location=UK",
    status: "partial",
    note: "intl-shipping detection needs page scan",
  },
  {
    n: 59,
    section: "E — Outreach (contact-form auto-submit)",
    prompt:
      "Pitch white-label inquiry through every Apollo competitor's contact form",
    actor: "contact_form_submit",
    filters: "searchQuery=Apollo alternatives cold email",
    status: "supported",
  },
  {
    n: 60,
    section: "E — Outreach (contact-form auto-submit)",
    prompt: "Submit affiliate program inquiry to top 30 SaaS billing tools",
    actor: "contact_form_submit",
    filters: "searchQuery=SaaS billing",
    status: "supported",
  },
  {
    n: 61,
    section: "E — Outreach (contact-form auto-submit)",
    prompt: "Send press release pitch to crypto media sites in EN",
    actor: "contact_form_submit",
    filters: "searchQuery=crypto news, lang=en",
    status: "supported",
  },
  {
    n: 62,
    section: "E — Outreach (contact-form auto-submit)",
    prompt: "Cold-pitch dental software vendors with my partnership offer",
    actor: "contact_form_submit",
    filters: "searchQuery=dental practice management software",
    status: "supported",
  },

  // ─── F — Recruiting ─────────────────────────────────────────────────────
  {
    n: 63,
    section: "F — Recruiting / talent sourcing",
    prompt:
      "Find React engineers in Seattle who recently posted 'open to work'",
    actor: "—",
    filters: "—",
    status: "unsupported",
    note: "needs linkedin-profile-scraper actor",
  },
  {
    n: 64,
    section: "F — Recruiting / talent sourcing",
    prompt:
      "Senior Python developers based in Toronto, posted side projects in last 90d",
    actor: "—",
    filters: "—",
    status: "unsupported",
  },
  {
    n: 65,
    section: "F — Recruiting / talent sourcing",
    prompt: "Designers with Dribbble profiles in 2026",
    actor: "—",
    filters: "—",
    status: "unsupported",
    note: "Dribbble actor not wired",
  },
  {
    n: 66,
    section: "F — Recruiting / talent sourcing",
    prompt: "Top 50 Substack writers in finance space",
    actor: "—",
    filters: "—",
    status: "unsupported",
  },
  {
    n: 67,
    section: "F — Recruiting / talent sourcing",
    prompt: "Companies actively hiring 5+ software engineers",
    actor: "hiring_intent",
    filters: "aggregate company-job-count",
    status: "partial",
  },

  // ─── G — PR / media outreach ────────────────────────────────────────────
  {
    n: 68,
    section: "G — PR / media outreach",
    prompt:
      "Tech journalists at major outlets writing about AI in last 90 days",
    actor: "web_serp + contact_form",
    filters: "published_date=90d",
    status: "partial",
    note: "author-page parsing needed",
  },
  {
    n: 69,
    section: "G — PR / media outreach",
    prompt: "Productivity podcast hosts with 1k+ ratings",
    actor: "—",
    filters: "—",
    status: "unsupported",
    note: "no podcast-directory actor",
  },
  {
    n: 70,
    section: "G — PR / media outreach",
    prompt: "Substack writers in finance and economics — top 100",
    actor: "—",
    filters: "—",
    status: "unsupported",
  },
  {
    n: 71,
    section: "G — PR / media outreach",
    prompt: "Climate-tech bloggers with newsletters and contact pages",
    actor: "web_serp + contact_form",
    filters: "has_email",
    status: "partial",
  },
  {
    n: 72,
    section: "G — PR / media outreach",
    prompt: "Submit press release to every English-language crypto news outlet",
    actor: "contact_form_submit",
    filters: "searchQuery=crypto news english",
    status: "supported",
  },

  // ─── H — E-commerce / DTC ───────────────────────────────────────────────
  {
    n: 73,
    section: "H — E-commerce / DTC partnerships",
    prompt: "DTC skincare brands on Shopify with 10k–100k Instagram followers",
    actor: "web_serp + Shopify + IG",
    filters: "specialized",
    status: "unsupported",
  },
  {
    n: 74,
    section: "H — E-commerce / DTC partnerships",
    prompt: "E-commerce brands with $1M–$10M revenue, US-shipping",
    actor: "web_serp + revenue proxy",
    filters: "revenue_band=1M-10M",
    status: "unsupported",
  },
  {
    n: 75,
    section: "H — E-commerce / DTC partnerships",
    prompt: "DTC apparel brands using influencer marketing in last 6 months",
    actor: "—",
    filters: "—",
    status: "unsupported",
    note: "sponsored-post detection needed",
  },
  {
    n: 76,
    section: "H — E-commerce / DTC partnerships",
    prompt:
      "Direct-to-consumer supplement brands with FDA-registered facilities",
    actor: "web_serp + regulatory check",
    filters: "fda_registered=true",
    status: "unsupported",
  },
  {
    n: 77,
    section: "H — E-commerce / DTC partnerships",
    prompt:
      "Submit logistics-partnership inquiry to UK Shopify brands with intl shipping",
    actor: "contact_form_submit",
    filters: "(see #58)",
    status: "supported",
  },

  // ─── I — Investor / fundraising / accelerator ──────────────────────────
  {
    n: 78,
    section: "I — Investor / fundraising / accelerator",
    prompt: "Pre-seed and seed VCs in the US that invest in B2B SaaS",
    actor: "web_serp + contact_form",
    filters: "stage=preseed/seed, vertical=B2B SaaS",
    status: "partial",
    note: "specialized VC actor would be cleaner",
  },
  {
    n: 79,
    section: "I — Investor / fundraising / accelerator",
    prompt: "Series A funds with public AI investments in last 12 months",
    actor: "web_serp + Crunchbase",
    filters: "thesis=AI, recent_investments=12mo",
    status: "unsupported",
  },
  {
    n: 80,
    section: "I — Investor / fundraising / accelerator",
    prompt: "Corporate VC arms of Fortune 500 in the energy sector",
    actor: "web_serp",
    filters: "type=corporate VC, vertical=energy",
    status: "partial",
  },
  {
    n: 81,
    section: "I — Investor / fundraising / accelerator",
    prompt: "All US accelerators with active programs in 2026",
    actor: "web_serp",
    filters: "status=active, country=US",
    status: "partial",
  },
  {
    n: 82,
    section: "I — Investor / fundraising / accelerator",
    prompt:
      "Submit pitch through contact form of every B2B SaaS-focused VC fund in Europe",
    actor: "contact_form_submit",
    filters: "searchQuery=B2B SaaS VC Europe",
    status: "supported",
  },

  // ─── J — Niche / vertical-specific ─────────────────────────────────────
  {
    n: 83,
    section: "J — Niche / vertical-specific",
    prompt: "Real estate agents in Miami with $50M+ annual sales volume",
    actor: "gmaps_leads + transactional",
    filters: "—",
    status: "partial",
  },
  {
    n: 84,
    section: "J — Niche / vertical-specific",
    prompt: "Wedding photographers with Instagram in California, 4.5+ stars",
    actor: "gmaps_leads",
    filters: "min_rating=4.5",
    status: "supported",
  },
  {
    n: 85,
    section: "J — Niche / vertical-specific",
    prompt: "Insurance brokers in Texas with sub-3.5-star reviews",
    actor: "gmaps_leads",
    filters: "max_rating=3.5",
    status: "supported",
  },
  {
    n: 86,
    section: "J — Niche / vertical-specific",
    prompt: "Personal trainers in NYC with active Instagram + 4+ stars",
    actor: "local_business",
    filters: "min_rating=4",
    status: "supported",
  },
  {
    n: 87,
    section: "J — Niche / vertical-specific",
    prompt: "Independent music venues in Austin",
    actor: "local_business",
    filters: "independent_only",
    status: "supported",
  },
  {
    n: 88,
    section: "J — Niche / vertical-specific",
    prompt: "Veterinary clinics in California with 4+ stars + email",
    actor: "gmaps_leads",
    filters: "min_rating=4, has_email",
    status: "supported",
  },
  {
    n: 89,
    section: "J — Niche / vertical-specific",
    prompt: "Boba tea shops in California (independent only)",
    actor: "local_business",
    filters: "independent_only",
    status: "supported",
  },
  {
    n: 90,
    section: "J — Niche / vertical-specific",
    prompt: "Tutors / education centers in Texas with website + phone",
    actor: "gmaps_leads",
    filters: "has_website, has_phone",
    status: "supported",
  },
  {
    n: 91,
    section: "J — Niche / vertical-specific",
    prompt: "Nail salons in Brooklyn with sub-3.5-star reviews",
    actor: "gmaps_leads",
    filters: "max_rating=3.5",
    status: "supported",
  },
  {
    n: 92,
    section: "J — Niche / vertical-specific",
    prompt: "Auto repair shops in Colorado with no Facebook / Instagram",
    actor: "local_business",
    filters: "no_socials",
    status: "supported",
  },
  {
    n: 93,
    section: "J — Niche / vertical-specific",
    prompt: "Daycare centers in California with email contact",
    actor: "gmaps_leads",
    filters: "has_email",
    status: "supported",
  },
  {
    n: 94,
    section: "J — Niche / vertical-specific",
    prompt: "Pet groomers in Florida with sub-50 reviews",
    actor: "local_business",
    filters: "max_reviews=50",
    status: "supported",
  },
  {
    n: 95,
    section: "J — Niche / vertical-specific",
    prompt: "Yoga teachers (independents) in San Francisco",
    actor: "local_business",
    filters: "independent_only",
    status: "supported",
  },
  {
    n: 96,
    section: "J — Niche / vertical-specific",
    prompt: "Massage therapists in Phoenix with 5-star ratings",
    actor: "gmaps_leads",
    filters: "min_rating=5",
    status: "supported",
  },
  {
    n: 97,
    section: "J — Niche / vertical-specific",
    prompt: "Tax preparers in Massachusetts with email + phone",
    actor: "gmaps_leads",
    filters: "has_email, has_phone",
    status: "supported",
  },
  {
    n: 98,
    section: "J — Niche / vertical-specific",
    prompt: "Dance studios in Chicago with no website",
    actor: "local_business",
    filters: "no_website",
    status: "supported",
  },
  {
    n: 99,
    section: "J — Niche / vertical-specific",
    prompt: "Carpet cleaners in Atlanta with under 30 reviews",
    actor: "local_business",
    filters: "max_reviews=30",
    status: "supported",
  },
  {
    n: 100,
    section: "J — Niche / vertical-specific",
    prompt: "Music studios in Austin with Instagram + 4.5 stars",
    actor: "gmaps_leads",
    filters: "min_rating=4.5",
    status: "supported",
  },
];

/** Count rows per status. Used by the /capabilities/scenarios KPI strip. */
export function scenarioStats() {
  const stats = {
    total: SCENARIOS.length,
    supported: 0,
    partial: 0,
    unsupported: 0,
  };
  for (const s of SCENARIOS) {
    if (s.status === "supported") stats.supported += 1;
    else if (s.status === "partial") stats.partial += 1;
    else stats.unsupported += 1;
  }
  return stats;
}

/** Group scenarios by their section heading, preserving section order. */
export function scenariosBySection(): Array<{
  section: ScenarioSection;
  rows: Scenario[];
}> {
  const order: ScenarioSection[] = [];
  const buckets = new Map<ScenarioSection, Scenario[]>();
  for (const s of SCENARIOS) {
    if (!buckets.has(s.section)) {
      buckets.set(s.section, []);
      order.push(s.section);
    }
    buckets.get(s.section)!.push(s);
  }
  return order.map((section) => ({ section, rows: buckets.get(section)! }));
}
