/**
 * Post-filter contradiction resolver.
 *
 * Some post-filter combinations are LOGICALLY impossible for a given
 * intent and silently produce zero leads. The poster child:
 *
 *   intent: gmaps_leads
 *   post_filters: { no_website: true, has_email: true }
 *
 * `gmaps_leads` only extracts emails by visiting business websites.
 * `no_website` drops anyone with a website. The intersection of "has
 * an email we could find" AND "has no website" is always empty.
 *
 * Production audit (May 2026): 4 of 6 zero-lead "completed" searches
 * across 2 weeks were exactly this pattern. The user retried the same
 * impossible filter combo 3 times, each one charging credits to scrape
 * + visit ~108 sites, only to drop every row at the filter stage.
 *
 * This module:
 *   1. Detects the contradiction.
 *   2. Picks the winner based on how much the user's prompt repeats
 *      each signal (occurrences of "with email", "owner email", etc
 *      vs "no website", "without a website").
 *   3. Returns the resolved filters + a structured warning the caller
 *      can surface in IntentPreview before charging credits.
 *
 * Stateless and prompt-aware — no side effects, safe to call from
 * the preview server action AND the createSearch server action.
 */

import type { PostFilters } from "./post-filters";

export interface PostFilterContradiction {
  /** The two filter keys that conflict. */
  filters: [keyof PostFilters, keyof PostFilters];
  /** Plain-English summary of why they conflict. */
  reason: string;
  /** Which filter was kept (the winner). */
  kept: keyof PostFilters;
  /**
   * Which filter was dropped (the loser). `null` when at least one of
   * the two filters was user-locked via `_userExplicit` — in that case
   * we record the contradiction (so the UI can warn) but don't actually
   * drop anything; both filters pass through unchanged.
   */
  dropped: keyof PostFilters | null;
  /**
   * True when the contradiction was recorded but no drop happened
   * because at least one side was user-locked. Distinct from a normal
   * drop so the UI can render this as a non-blocking warning rather
   * than a "we changed your filters" notice.
   */
  locked?: boolean;
  /** Prompt-mention counts for both filters — used to pick the winner. */
  scores: Record<string, number>;
}

/**
 * True when `key` appears in the resolved filters' `_userExplicit` list.
 * User-locked keys are not eligible for auto-drop in contradiction
 * resolution; the UI surfaces the conflict as a warning instead.
 */
function isUserLocked(pf: PostFilters, key: keyof PostFilters): boolean {
  const list = (pf._userExplicit ?? []) as string[];
  return list.includes(String(key));
}

export interface PostFilterResolveResult {
  /** Sanitized filters with contradictory keys dropped. */
  filters: PostFilters;
  /** One entry per contradiction we resolved. Empty when filters were already coherent. */
  contradictions: PostFilterContradiction[];
}

/**
 * Tokens we look for in the original prompt to decide which side of a
 * contradiction has more signal. Conservative — only patterns that
 * unambiguously mean "I want X" or "I don't want X" on the topic.
 * Word-boundary regex so partial matches don't fire.
 */
/**
 * Map of filter key → regex patterns we look for in the user's prompt to
 * count how strongly they asked for that filter. Only filled in for the
 * filter keys that actually participate in known contradictions; the
 * default for unlisted keys is `[]` (zero signal — wouldn't win a tie
 * anyway, since these filters aren't in any contradiction rule).
 *
 * Word-boundary regex so partial matches don't fire.
 */
const SIGNAL_TOKENS: Partial<Record<keyof PostFilters, RegExp[]>> = {
  no_website: [
    /\bno website\b/i,
    /\bwithout a? website\b/i,
    /\bwithout website\b/i,
    /\bdon'?t have a website\b/i,
    /\bdoes not have a website\b/i,
    /\bno online presence\b/i,
  ],
  has_website: [
    /\bwith a website\b/i,
    /\bhas a website\b/i,
    /\bwith website\b/i,
  ],
  has_email: [
    /\bwith email\b/i,
    /\bwith emails\b/i,
    /\bget (?:their )?emails?\b/i,
    /\bowner emails?\b/i,
    /\bcontact emails?\b/i,
    /\bemail enrich(?:ment)?\b/i,
    /\bi want (?:their )?emails?\b/i,
    /\bgive me (?:their )?emails?\b/i,
  ],
  has_phone: [
    /\bwith phones?\b/i,
    /\bphone numbers?\b/i,
    /\bcontact phones?\b/i,
  ],
  no_instagram: [/\bno instagram\b/i, /\bwithout instagram\b/i, /\bno ig\b/i],
  no_facebook: [/\bno facebook\b/i, /\bwithout facebook\b/i],
  no_linkedin: [/\bno linkedin\b/i, /\bwithout linkedin\b/i],
};

/**
 * Count how many distinct token-patterns from `tokens` appear in `prompt`.
 * Each pattern counts at most once even if it matches multiple times — we
 * want signal diversity, not raw repetition. (The Lahore-gym user wrote
 * "with emails" five times; the diversity-1 score keeps us honest.)
 */
function scoreSignal(prompt: string, tokens: RegExp[]): number {
  return tokens.reduce((n, rx) => (rx.test(prompt) ? n + 1 : n), 0);
}

/**
 * The known pairwise contradictions. Each entry has:
 *   - A predicate that checks whether both filters are set
 *   - A human-readable explanation
 *   - Which intent(s) this contradiction applies to (some are universal,
 *     some are intent-specific)
 */
interface ContradictionRule {
  id: string;
  whenFilters: (pf: PostFilters) => boolean;
  appliesToIntent?: ReadonlyArray<string>;
  filters: [keyof PostFilters, keyof PostFilters];
  reason: string;
}

const RULES: ContradictionRule[] = [
  {
    id: "no_website + has_email (gmaps_leads)",
    whenFilters: (pf) => !!pf.no_website && !!pf.has_email,
    appliesToIntent: ["gmaps_leads", "local_business", "contact_form"],
    filters: ["no_website", "has_email"],
    reason:
      "Emails are extracted by visiting each business's website. A business with no website has no email to find, so the intersection of 'no website' + 'has email' is always empty.",
  },
  {
    id: "no_website + has_website",
    whenFilters: (pf) => !!pf.no_website && !!pf.has_website,
    filters: ["no_website", "has_website"],
    reason:
      "'No website' and 'has website' are mutually exclusive — a business can have one or the other, not both.",
  },
];

/**
 * Resolve any contradictions in the post-filters. Returns the cleaned
 * filters + a list of what was changed and why.
 *
 * Behavior:
 *   - For each contradiction rule that fires, we score both sides of
 *     the pair against the user's prompt.
 *   - The side with the higher score wins; the loser is dropped.
 *   - If both sides score 0 (router added the filter without textual
 *     support — happens for `has_email` when `enrichEmails` actor flag
 *     is on), we apply a per-rule default: for the gmaps_leads case,
 *     we keep `has_email` (the more common user intent when both are
 *     ambiguous) — but emit the warning either way so the user sees
 *     the resolution before credits are charged.
 */
export function resolvePostFilters(
  prompt: string,
  intent: string,
  postFilters: PostFilters | null | undefined,
): PostFilterResolveResult {
  const pf: PostFilters = { ...(postFilters ?? {}) };
  const contradictions: PostFilterContradiction[] = [];

  for (const rule of RULES) {
    if (rule.appliesToIntent && !rule.appliesToIntent.includes(intent)) {
      continue;
    }
    if (!rule.whenFilters(pf)) continue;

    const [a, b] = rule.filters;
    const aScore = scoreSignal(prompt, SIGNAL_TOKENS[a] ?? []);
    const bScore = scoreSignal(prompt, SIGNAL_TOKENS[b] ?? []);

    // Pick the winner. Ties broken in favor of `has_email` / `has_website`
    // / `has_phone` (positive filters) over their negative counterparts
    // — produces useful leads more often when the user's prompt is
    // ambiguous.
    let kept: keyof PostFilters;
    let dropped: keyof PostFilters;
    if (aScore > bScore) {
      kept = a;
      dropped = b;
    } else if (bScore > aScore) {
      kept = b;
      dropped = a;
    } else {
      // Tie — prefer the positive filter (`has_*`) over the negative
      // (`no_*`). The positive filter delivers actionable rows; the
      // negative filter excludes data the user might still want.
      const aPositive = String(a).startsWith("has_");
      const bPositive = String(b).startsWith("has_");
      if (aPositive && !bPositive) {
        kept = a;
        dropped = b;
      } else if (bPositive && !aPositive) {
        kept = b;
        dropped = a;
      } else {
        kept = a;
        dropped = b;
      }
    }

    // If either side of the pair is user-locked via _userExplicit, we
    // record the contradiction but skip the drop. The UI gets a warning
    // (locked=true); the user can still submit if they really want this
    // combo (escape hatch — never silently override explicit intent).
    const keptLocked = isUserLocked(pf, kept);
    const droppedLocked = isUserLocked(pf, dropped);
    if (keptLocked || droppedLocked) {
      contradictions.push({
        filters: rule.filters,
        reason: rule.reason,
        kept,
        dropped: null,
        locked: true,
        scores: { [a]: aScore, [b]: bScore },
      });
      continue;
    }

    delete pf[dropped];
    contradictions.push({
      filters: rule.filters,
      reason: rule.reason,
      kept,
      dropped,
      scores: { [a]: aScore, [b]: bScore },
    });
  }

  return { filters: pf, contradictions };
}
