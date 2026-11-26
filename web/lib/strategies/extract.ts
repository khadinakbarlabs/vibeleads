/**
 * Bridge from router output to ParsedFilters.
 *
 * The AI router currently returns `{ intent, actorInput, postFilters }`
 * (see `lib/ai/router.ts`). The strategy layer wants ParsedFilters. This
 * module is the translation — it reads the actor input + post-filter
 * fields and projects them into the strategy-layer shape.
 *
 * Two reasons we keep this as a separate module:
 *  1. Adding new actor schemas only changes the lookup here, not router or
 *     strategies.
 *  2. The router stays narrow (prompt → tool call); decision logic owns
 *     the field mapping rather than spreading it across producers.
 */
import "server-only";
import type { ParsedFilters } from "./types";
import type { Intent } from "@/lib/apify/actors";
import type { PostFilters } from "@/lib/normalize/post-filters";

export interface RouterOutputForExtract {
  intent: Intent;
  actorInput: Record<string, unknown>;
  postFilters: PostFilters | null;
}

/**
 * Project the router output into ParsedFilters. Defensive: unknown shapes
 * fall through silently because the live search flow tolerates a thin
 * filters object (decide() picks the fallback strategy instead of
 * crashing).
 */
export function extractFiltersFromRoute(
  route: RouterOutputForExtract,
): ParsedFilters {
  const filters: ParsedFilters = {};
  const ai = route.actorInput;
  const pf = route.postFilters ?? {};

  // ─── Source — derived from intent ────────────────────────────────────────
  switch (route.intent) {
    case "producthunt":
      filters.source = "producthunt";
      break;
    case "web_serp":
      filters.source = "google_serp";
      break;
    case "hiring_intent":
      filters.source = "linkedin_jobs";
      filters.hiringSignal = true;
      break;
    case "contact_form":
      filters.source = "google_serp";
      break;
    case "contact_form_submit":
      filters.submitOutreach = true;
      break;
    case "local_business":
    case "gmaps_leads":
      filters.source = "google_maps";
      break;
    case "talent_sourcing":
      filters.source = "linkedin_profiles";
      filters.talentSignal = true;
      // The actor's includeEmail flag — surface as hasEmail so the
      // strategy layer composes the right recipe (with-email vs basic).
      if (readBoolean(ai, "includeEmail")) filters.hasEmail = true;
      break;
    case "reviews_gmaps":
      filters.source = "google_maps";
      filters.reviewsAudit = true;
      break;
    case "reviews_trustpilot":
      filters.source = "trustpilot";
      filters.reviewsAudit = true;
      break;
  }

  // ─── Category & location — try the common actor fields ──────────────────
  const searchQuery =
    readString(ai, "searchQuery") ?? readString(ai, "businessType");
  if (searchQuery) filters.category = searchQuery;

  const queriesArr =
    readStringArray(ai, "searchQueries") ?? readStringArray(ai, "queries");
  if (queriesArr && queriesArr.length > 0 && !filters.category) {
    filters.category = queriesArr[0];
  }

  const location = readString(ai, "location");
  if (location) filters.location = location;

  const locationsArr = readStringArray(ai, "locations");
  if (locationsArr && locationsArr.length > 0 && !filters.location) {
    filters.location = locationsArr[0];
  }

  // ─── Limit ──────────────────────────────────────────────────────────────
  // Note: review actors expose `maxReviews` (per place) and
  // `maxReviewsPerCompany` (Trustpilot) instead of maxResults — those map
  // to the user's review-pull cap, not lead count. Read both.
  filters.limit =
    pf.limit ??
    readNumber(ai, "maxResults") ??
    readNumber(ai, "resultsPerPage") ??
    readNumber(ai, "maxReviews") ??
    readNumber(ai, "maxReviewsPerCompany") ??
    50;

  // ─── Email / phone / website inclusion ─────────────────────────────────
  if (pf.has_email || readBoolean(ai, "enrichEmails")) filters.hasEmail = true;
  if (pf.has_phone) filters.hasPhone = true;
  if (pf.has_website) filters.hasWebsite = true;
  if (pf.no_website) filters.noWebsite = true;

  // ─── Socials ────────────────────────────────────────────────────────────
  if (pf.no_socials) filters.noSocials = true;
  if (pf.no_instagram) filters.noInstagram = true;
  if (pf.no_facebook) filters.noFacebook = true;
  if (pf.no_linkedin) filters.noLinkedin = true;

  // ─── Quality signals ───────────────────────────────────────────────────
  if (pf.min_rating != null) filters.minRating = pf.min_rating;
  // Some actors expose minRating as a top-level input field (Google Maps).
  const inputMinRating = readNumber(ai, "minRating");
  if (
    filters.minRating == null &&
    inputMinRating != null &&
    inputMinRating > 0
  ) {
    filters.minRating = inputMinRating;
  }
  if (pf.max_rating != null) filters.maxRating = pf.max_rating;
  if (pf.min_reviews != null) filters.minReviews = pf.min_reviews;
  if (pf.max_reviews != null) filters.maxReviews = pf.max_reviews;

  // ─── Independent-only / slow-website ────────────────────────────────────
  if (pf.independent_only) filters.independentOnly = true;
  if (pf.slow_website) filters.slowWebsite = true;
  if (pf.min_pagespeed_score != null)
    filters.minPagespeed = pf.min_pagespeed_score;
  if (pf.max_pagespeed_score != null)
    filters.maxPagespeed = pf.max_pagespeed_score;

  return filters;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — lightweight typed accessors so we don't sprinkle casts everywhere.
// ─────────────────────────────────────────────────────────────────────────────

function readString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

function readStringArray(
  obj: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  return arr.length > 0 ? arr : undefined;
}

function readNumber(
  obj: Record<string, unknown>,
  key: string,
): number | undefined {
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function readBoolean(
  obj: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const v = obj[key];
  return typeof v === "boolean" ? v : undefined;
}
