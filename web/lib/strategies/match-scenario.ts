/**
 * Token-based scenario matcher.
 *
 * Reused by:
 *   - the MCP `find_scenario` tool (lib-internal, no LLM, pure data)
 *   - `/search/new` preview action — surfaces a warning when the user's
 *     prompt looks like a scenario we've explicitly marked unsupported
 *     or partial, BEFORE spending a credit
 *
 * Pulled out of `app/api/mcp/route.ts` so both call sites share the
 * exact same scoring. If the algorithm changes, the warning copy stays
 * in lockstep with what the MCP tool reports.
 *
 * Scoring: token Jaccard similarity over `prompt + section + actor +
 * filters + note`. Stop-word removal is implicit via a 3-char minimum.
 */

import { SCENARIOS, type Scenario } from "./scenarios";

export interface ScenarioMatch {
  scenario: Scenario;
  score: number;
}

/**
 * Score every scenario against the user's prompt and return the top N.
 * Empty array when the query is too short to produce meaningful tokens.
 */
export function findMatchingScenarios(
  prompt: string,
  limit = 5,
): ScenarioMatch[] {
  const queryTokens = tokenize(prompt);
  if (queryTokens.size === 0) return [];

  return SCENARIOS.map((s) => {
    const haystack = `${s.prompt} ${s.section} ${s.actor} ${s.filters} ${s.note ?? ""}`;
    const score = jaccardSimilarity(queryTokens, tokenize(haystack));
    return { scenario: s, score };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Lowercase + tokenize a string into a Set of words 3+ chars long.
 * Stop-word removal is implicit via the length filter — common words
 * like "the", "and", "of" are too short to matter.
 */
export function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. Range [0, 1]. */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const tok of a) {
    if (b.has(tok)) overlap += 1;
  }
  const union = a.size + b.size - overlap;
  return union === 0 ? 0 : overlap / union;
}
