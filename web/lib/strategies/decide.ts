/**
 * Decision function: given parsed filters from the AI router, pick the
 * strongest matching strategy from the catalog.
 *
 * Strategy selection is deterministic — for a given ParsedFilters input,
 * we always return the same strategy. This is the integration test
 * surface for the whole routing layer.
 *
 * Algorithm:
 *   1. For every strategy in the catalog, check if `requires` matches.
 *   2. Of the matching strategies, pick the one with the highest priority.
 *   3. If none match, fall back to the default local-business strategy.
 *
 * The catalog (loaded lazily) is in `catalog.ts`.
 */
import "server-only";
import type { ParsedFilters, Strategy } from "./types";
import { STRATEGIES } from "./catalog";
import { costRecipe, type RecipeCost } from "@/lib/tasks/credit-calc";

export interface DecisionResult {
  strategy: Strategy;
  /** All strategies that matched, sorted by priority descending. Useful for UI. */
  candidates: Strategy[];
  cost: RecipeCost;
}

/**
 * Lookup a strategy by id. Falls back to `default_local_basic` when missing
 * (defensive — prevents a broken catalog from crashing the search flow).
 */
export function getStrategy(id: string): Strategy {
  return (
    STRATEGIES.find((s) => s.id === id) ??
    STRATEGIES.find((s) => s.id === "default_local_basic") ??
    STRATEGIES[0]
  );
}

/**
 * Pick the best strategy for a given ParsedFilters.
 */
export function decide(filters: ParsedFilters): DecisionResult {
  const candidates = STRATEGIES.filter((s) =>
    matches(s.requires, filters),
  ).sort((a, b) => b.priority - a.priority);

  const strategy =
    candidates[0] ??
    STRATEGIES.find((s) => s.id === "default_local_basic") ??
    STRATEGIES[0];

  const recipe = strategy.buildRecipe(filters);
  const cost = costRecipe(recipe);

  return { strategy, candidates, cost };
}

/** Check that every key in `req` matches the corresponding key in `f`. */
function matches(
  req: Partial<ParsedFilters> | undefined,
  f: ParsedFilters,
): boolean {
  if (!req) return true;
  for (const [key, expected] of Object.entries(req)) {
    const actual = (f as Record<string, unknown>)[key];
    // Boolean: must equal exactly. (false is a real signal — "noWebsite=false"
    // is different from "noWebsite=undefined".)
    if (typeof expected === "boolean") {
      if (actual !== expected) return false;
      continue;
    }
    // Numbers / strings: actual must be defined and equal (rare in requires).
    if (actual !== expected) return false;
  }
  return true;
}
