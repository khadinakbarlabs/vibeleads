/**
 * Native target discovery — replaces the actor's SERP-then-pray pipeline
 * with a two-stage funnel that actually finds CONTACT PAGES.
 *
 * Stage 1 (SerpAPI Google): for each (businessType, location) we query
 *   `<businessType> "<location>" contact`
 * which strongly biases the results toward contact/about pages instead
 * of directory listicles. Returns up to N organic results.
 *
 * Stage 2 (contact-page resolver): when a Stage-1 result lands on a
 * homepage, we follow same-host anchor text matching /contact|get in
 * touch|reach (out|us)/ so the submitter loop opens a page that has a
 * form, not a marketing splash. Skipped for results that already look
 * like a contact page.
 *
 * Filters out the listicle/aggregator noise that drives `no_channel`:
 *   yelp.com, tripadvisor, yellowpages, mapquest, facebook, ...
 *
 * No browser launched here — Stage 2 uses fetch() with a realistic UA,
 * keeping discovery cheap and Vercel-safe (relevant when this module
 * later moves into the Next app as `lib/outreach/discover-targets.ts`).
 *
 * NOTE: this module deliberately does NOT import `./config` for its
 * dotenv side-effect. Doing so drags `dotenv` (a submitter-only dep)
 * into the Next.js bundle via `lib/outreach/discover.ts` and Vercel's
 * install — which only resolves root package.json — fails the build.
 *
 * Callers load env themselves:
 *   - CLI       → `discover-cli.ts` imports `./config` (dotenv)
 *   - Next app  → Next loads .env.local automatically
 *   - Trigger.dev tasks → env injected by Trigger Cloud
 */

export interface DiscoverInput {
  businessType: string;
  location: string;
  /** Hard cap on returned URLs. Defaults to 25. */
  maxResults?: number;
  /** Optional override of the SerpAPI query. */
  customQuery?: string;
}

export interface TargetUrl {
  /** Resolved contact-page URL (or homepage if no contact link was found). */
  url: string;
  businessName: string | null;
  /** Domain we extracted (lowercase, no www). */
  domain: string;
  /** Stage-1 result rank (1-based) — useful for "top N" caps. */
  rank: number;
  /** Whether stage 2 resolved a contact page off the original URL. */
  resolvedContactPage: boolean;
  source: "serpapi";
}

export interface DiscoverResult {
  targets: TargetUrl[];
  callCount: number;
  /** Domains dropped by the noise filter — surfaced for telemetry. */
  droppedDomains: string[];
}

const NOISE_HOSTS = new Set([
  "yelp.com",
  "tripadvisor.com",
  "yellowpages.com",
  "mapquest.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "pinterest.com",
  "wikipedia.org",
  "reddit.com",
  "tiktok.com",
  "youtube.com",
  "amazon.com",
  "ebay.com",
  // SERP-listicle / aggregators that almost never have a usable form.
  "expedia.com",
  "booking.com",
  "trivago.com",
  "thumbtack.com",
  "angi.com",
  "houzz.com",
  "bbb.org",
]);

const CONTACT_HINT = /contact|get-in-touch|reach-us|reach-out|about\/contact/i;
const ANCHOR_TEXT_HINT =
  /\b(contact( us)?|get in touch|reach (out|us)|hire us|work with (us|me)|say hello|send us a message|message us|enquir(e|y)|inquir(e|y)|book (a|an|now)|appointment|request a quote|get a quote)\b/i;
// Common contact-page paths to probe directly when the homepage anchor scan
// finds nothing (SPA nav that didn't render server-side, etc.).
const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/contactus",
  "/get-in-touch",
  "/contact.html",
];
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface SerpOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  source?: string;
}
interface SerpResponse {
  organic_results?: SerpOrganicResult[];
}

async function serpApiSearch(
  query: string,
  apiKey: string,
): Promise<SerpResponse> {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    hl: "en",
    num: "20",
  });
  const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as SerpResponse;
}

/**
 * Fetch a homepage and return the first same-host link whose href or
 * anchor text matches a contact-page hint. Returns null on any failure
 * (the caller will just use the original URL).
 */
async function resolveContactPage(homepageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(homepageUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const homepageHost = domainOf(homepageUrl);
    if (!homepageHost) return null;

    // Lightweight anchor scan — no DOM parser dependency.
    const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html))) {
      const href = match[1];
      const inner = (match[2] || "").replace(/<[^>]+>/g, "").trim();
      if (!href) continue;
      let absolute: string;
      try {
        absolute = new URL(href, homepageUrl).toString();
      } catch {
        continue;
      }
      const host = domainOf(absolute);
      if (!host || host !== homepageHost) continue;
      if (CONTACT_HINT.test(absolute) || ANCHOR_TEXT_HINT.test(inner)) {
        return absolute;
      }
    }

    // Anchor scan found nothing (SPA nav, JS-rendered menu). Probe common
    // contact paths directly — a 2xx means a likely contact page exists.
    try {
      const base = new URL(homepageUrl);
      for (const path of CONTACT_PATHS) {
        const probe = `${base.origin}${path}`;
        const head = await fetch(probe, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(4_000),
        }).catch(() => null);
        if (head && head.ok) return probe;
      }
    } catch {
      // origin parse / probe failure — fall through to null
    }
    return null;
  } catch {
    return null;
  }
}

export async function discoverTargets(
  input: DiscoverInput,
): Promise<DiscoverResult> {
  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "SERPAPI_KEY is not set. Add it to .env.local or submitter/.env.",
    );
  }
  const maxResults = Math.min(50, Math.max(1, input.maxResults ?? 25));
  const query =
    input.customQuery?.trim() ||
    `${input.businessType} "${input.location}" contact`;

  const serp = await serpApiSearch(query, apiKey);
  const callCount = 1;

  const seenDomains = new Set<string>();
  const droppedDomains: string[] = [];
  const candidates: TargetUrl[] = [];

  for (const r of serp.organic_results ?? []) {
    if (candidates.length >= maxResults) break;
    if (!r.link) continue;
    const domain = domainOf(r.link);
    if (!domain) continue;
    if (NOISE_HOSTS.has(domain)) {
      if (!droppedDomains.includes(domain)) droppedDomains.push(domain);
      continue;
    }
    // One target per domain — avoids hammering the same business twice
    // when SerpAPI returns /contact and /about for the same site.
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);

    candidates.push({
      url: r.link,
      businessName: r.title ?? null,
      domain,
      rank: r.position ?? candidates.length + 1,
      resolvedContactPage: false,
      source: "serpapi",
    });
  }

  // Stage 2: parallel contact-page resolution for URLs that don't already
  // look like contact pages.
  const resolved = await Promise.all(
    candidates.map(async (c) => {
      if (CONTACT_HINT.test(c.url)) return { ...c, resolvedContactPage: true };
      const contact = await resolveContactPage(c.url);
      return contact
        ? { ...c, url: contact, resolvedContactPage: true }
        : { ...c, resolvedContactPage: false };
    }),
  );

  return { targets: resolved, callCount, droppedDomains };
}
