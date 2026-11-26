/**
 * Google PageSpeed Insights enrichment. Calls the PSI API for a lead's
 * website URL and returns the mobile performance score + Core Web Vitals
 * timings. Powers the 'slow website' / 'PageSpeed < N' filter family.
 *
 * Free tier: 25,000 requests/day with PAGESPEED_API_KEY set. Without
 * the key, the API still works but at a much lower quota — we treat
 * the absence of the key as a hard skip so we never silently leak free
 * quota to other apps on the same network.
 *
 * Cost model: free. We don't charge credits for this enrichment when
 * the key is set; when the key is absent, the step is skipped entirely.
 */
import "server-only";
import { serverEnv } from "@/lib/env.server";

export interface PageSpeedResult {
  /** 0-100 mobile performance score from Lighthouse. */
  score: number;
  /** Largest Contentful Paint, milliseconds. */
  lcpMs: number | null;
  /** First Contentful Paint, milliseconds. */
  fcpMs: number | null;
  /** API call status — 'ok', 'http_NNN', 'invalid_url', 'network_error', 'no_key'. */
  rawStatus: string;
}

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Hard timeout — PSI can take 20-40s for a slow site, but we cap to keep enrichment bounded. */
const PSI_TIMEOUT_MS = 45_000;

/**
 * Score a single URL. Returns null when:
 *   - no PAGESPEED_API_KEY is configured (caller should skip)
 *   - the URL is malformed
 *   - the API errors out (network / rate limit / etc.)
 *
 * Never throws — failure is communicated via the rawStatus field.
 */
export async function scorePageSpeed(
  url: string,
): Promise<PageSpeedResult | null> {
  if (!serverEnv.PAGESPEED_API_KEY) {
    return null;
  }
  // Validate the URL up front. The PSI API will return a 400 anyway, but
  // we save a round-trip when the upstream lead has a malformed website.
  try {
    new URL(url);
  } catch {
    return { score: 0, lcpMs: null, fcpMs: null, rawStatus: "invalid_url" };
  }

  const params = new URLSearchParams({
    url,
    key: serverEnv.PAGESPEED_API_KEY,
    strategy: "mobile",
    // Only request the performance category — keeps the response small.
    category: "performance",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        score: 0,
        lcpMs: null,
        fcpMs: null,
        rawStatus: `http_${res.status}`,
      };
    }
    const json = (await res.json()) as PsiResponse;
    return parsePsi(json);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      score: 0,
      lcpMs: null,
      fcpMs: null,
      rawStatus: aborted ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

interface PsiAuditValue {
  numericValue?: number;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
    };
    audits?: {
      "largest-contentful-paint"?: PsiAuditValue;
      "first-contentful-paint"?: PsiAuditValue;
    };
  };
}

function parsePsi(json: PsiResponse): PageSpeedResult {
  const performance = json.lighthouseResult?.categories?.performance;
  const audits = json.lighthouseResult?.audits;
  // PSI returns 0..1 — multiply by 100 for an integer percentage.
  const rawScore = performance?.score;
  const score =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.round(rawScore * 100)
      : 0;
  const lcp = audits?.["largest-contentful-paint"]?.numericValue;
  const fcp = audits?.["first-contentful-paint"]?.numericValue;
  return {
    score,
    lcpMs: typeof lcp === "number" ? Math.round(lcp) : null,
    fcpMs: typeof fcp === "number" ? Math.round(fcp) : null,
    rawStatus: "ok",
  };
}

/**
 * Bucket a 0-100 score into A/B/C/D for UI display. Matches Lighthouse's
 * own thresholds: ≥90 = good, ≥50 = needs-improvement, < 50 = poor.
 */
export function pagespeedGrade(
  score: number | null,
): "A" | "B" | "C" | "D" | null {
  if (score == null) return null;
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  return "D";
}
