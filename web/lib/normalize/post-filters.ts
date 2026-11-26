/**
 * Server-side post-filters. The AI router decides at routing time which
 * criteria the upstream actor can express natively (e.g. min_rating on
 * Google Maps actor) and which need post-hoc filtering (e.g. no_website,
 * no_instagram). Post-filters live on the search row and are applied in
 * finalizeSucceeded before lead upsert.
 *
 * Limit caps the post-filtered output. We oversample by ~2-3× at scrape
 * time so the post-filter doesn't starve the user's requested count.
 */
import { z } from "zod";
import type { NormalizedLead } from "./types";
import { CHAIN_REGISTRY_SIZE, matchChain } from "./chain-blacklist";

export const PostFiltersSchema = z.object({
  no_website: z.boolean().optional(),
  no_instagram: z.boolean().optional(),
  no_facebook: z.boolean().optional(),
  no_linkedin: z.boolean().optional(),
  no_socials: z.boolean().optional(),
  has_email: z.boolean().optional(),
  has_phone: z.boolean().optional(),
  has_website: z.boolean().optional(),
  /** Counterpart to no_instagram — keep only leads with an IG handle. */
  has_instagram: z.boolean().optional(),
  /** Counterpart to no_facebook. */
  has_facebook: z.boolean().optional(),
  /** Counterpart to no_linkedin. */
  has_linkedin: z.boolean().optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_rating: z.number().min(0).max(5).optional(),
  min_reviews: z.number().int().min(0).optional(),
  max_reviews: z.number().int().min(0).optional(),
  categories_include: z.array(z.string().min(1)).optional(),
  categories_exclude: z.array(z.string().min(1)).optional(),
  /**
   * When true, drop leads whose business name or website matches a known
   * national / global chain (Marriott, Starbucks, Planet Fitness, etc).
   * Powers the 'independent businesses only' use cases (UC-3 indie
   * restaurants, UC-14 boutique hotels, UC-15 indie bike shops).
   */
  independent_only: z.boolean().optional(),
  /**
   * When true, drop leads whose website scored ≥75 on Google PageSpeed
   * Insights. Use to find businesses that need a redesign / agency
   * pitch territory. Requires PAGESPEED_API_KEY to be set; without it
   * the filter is a no-op.
   */
  slow_website: z.boolean().optional(),
  /** Optional explicit threshold (0-100) — overrides slow_website default of 75. */
  max_pagespeed_score: z.number().int().min(0).max(100).optional(),
  /** Inverse of slow_website — drop leads scoring BELOW this threshold. */
  min_pagespeed_score: z.number().int().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(5_000).optional(),
  /**
   * Filter keys the user set explicitly via the /search/new config
   * panel. The resolver treats these as locked — it never auto-drops
   * a user-locked key when a contradiction is detected. Contradictions
   * are still recorded so the UI can surface a warning. Empty or
   * missing means router-only inference (existing behaviour).
   */
  _userExplicit: z.array(z.string()).optional(),
});

export type PostFilters = z.infer<typeof PostFiltersSchema>;

export function applyPostFilters(
  leads: NormalizedLead[],
  pf: PostFilters | null | undefined,
): NormalizedLead[] {
  if (!pf || Object.keys(pf).length === 0) return leads;

  const filtered = leads.filter((l) => {
    const socials = l.socials ?? {};
    if (pf.no_website && l.website) return false;
    if (pf.has_website && !l.website) return false;
    if (pf.no_instagram && socials.instagram) return false;
    if (pf.no_facebook && socials.facebook) return false;
    if (pf.no_linkedin && socials.linkedin) return false;
    if (pf.no_socials && Object.keys(socials).length > 0) return false;
    // Counterpart "must have <network>" filters
    if (pf.has_instagram && !socials.instagram) return false;
    if (pf.has_facebook && !socials.facebook) return false;
    if (pf.has_linkedin && !socials.linkedin) return false;
    if (pf.has_email && l.emails.length === 0) return false;
    if (pf.has_phone && l.phones.length === 0) return false;
    if (pf.min_rating != null && (l.rating == null || l.rating < pf.min_rating))
      return false;
    if (pf.max_rating != null && l.rating != null && l.rating > pf.max_rating)
      return false;
    if (
      pf.min_reviews != null &&
      (l.review_count == null || l.review_count < pf.min_reviews)
    )
      return false;
    if (
      pf.max_reviews != null &&
      l.review_count != null &&
      l.review_count > pf.max_reviews
    )
      return false;
    if (pf.categories_include?.length) {
      const cats = (l.categories ?? []).map((c) => c.toLowerCase());
      const wanted = pf.categories_include.map((c) => c.toLowerCase());
      if (!wanted.some((w) => cats.some((c) => c.includes(w)))) return false;
    }
    if (pf.categories_exclude?.length) {
      const cats = (l.categories ?? []).map((c) => c.toLowerCase());
      const blocked = pf.categories_exclude.map((c) => c.toLowerCase());
      if (blocked.some((b) => cats.some((c) => c.includes(b)))) return false;
    }
    if (pf.independent_only) {
      if (matchChain(l) != null) return false;
    }
    return true;
  });

  if (pf.limit != null && filtered.length > pf.limit) {
    return filtered.slice(0, pf.limit);
  }
  return filtered;
}

/**
 * Translates a PostFilters object into a human-readable summary for the
 * intent preview UI. Returns one line per active filter.
 */
export function describePostFilters(
  pf: PostFilters | null | undefined,
): string[] {
  if (!pf) return [];
  const lines: string[] = [];
  if (pf.no_website) lines.push("no website");
  if (pf.has_website) lines.push("has website");
  if (pf.no_instagram) lines.push("no Instagram");
  if (pf.no_facebook) lines.push("no Facebook");
  if (pf.no_linkedin) lines.push("no LinkedIn");
  if (pf.no_socials) lines.push("no social presence");
  if (pf.has_email) lines.push("has email");
  if (pf.has_phone) lines.push("has phone");
  if (pf.min_rating != null) lines.push(`rating ≥ ${pf.min_rating.toFixed(1)}`);
  if (pf.max_rating != null) lines.push(`rating ≤ ${pf.max_rating.toFixed(1)}`);
  if (pf.min_reviews != null) lines.push(`≥ ${pf.min_reviews} reviews`);
  if (pf.max_reviews != null) lines.push(`≤ ${pf.max_reviews} reviews`);
  if (pf.categories_include?.length)
    lines.push(`category includes: ${pf.categories_include.join(", ")}`);
  if (pf.categories_exclude?.length)
    lines.push(`category excludes: ${pf.categories_exclude.join(", ")}`);
  if (pf.independent_only)
    lines.push(`independent only (drops ${CHAIN_REGISTRY_SIZE}+ known chains)`);
  if (pf.limit != null) lines.push(`limit ${pf.limit}`);
  return lines;
}
