/**
 * Strategy layer — sits ABOVE the leaf-task registry, BELOW the AI router.
 *
 * The AI router parses a free-text user prompt into a `ParsedFilters` shape
 * (what they want, where, with what constraints). The decision function
 * (`decide.ts`) picks the strongest matching `Strategy` from the catalog,
 * which composes leaf tasks from `lib/tasks/registry.ts` into a recipe
 * with cost + credit math.
 *
 * Why a strategy layer:
 * - The AI router shouldn't have to know that "no website + needs email"
 *   means SERP + contact-details rather than Google Maps. That's domain
 *   logic. Strategies own that knowledge.
 * - When MCP comes (see ANTHROPIC_PLATFORM.md), each strategy becomes a
 *   tool definition external models can pick from.
 * - Pre-computed strategies are testable: given filters X, decide should
 *   return strategy Y. This is the integration test surface for the router.
 */
import type { RecipeStep } from "@/lib/tasks/credit-calc";

/**
 * The output of the AI router after parsing a user prompt. The shape is
 * deliberately wider than what any single actor accepts — a strategy
 * decides which subset to forward.
 */
export interface ParsedFilters {
  // ─── Targeting ────────────────────────────────────────────────────────────
  /** Location string (city, state, country, region). */
  location?: string;
  /** Category / business type ("yoga studio", "dental clinic", "SaaS"). */
  category?: string;
  /** Original user prompt — strategies may pass this through to actors verbatim. */
  rawPrompt?: string;
  /** Industry / vertical hint when category is general ("fintech", "healthcare", "ecommerce"). */
  industry?: string;

  // ─── Quantity ─────────────────────────────────────────────────────────────
  /** How many leads the user wants (post-filter). Defaults to 50 in decide. */
  limit?: number;

  // ─── Inclusion / exclusion filters ───────────────────────────────────────
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  noWebsite?: boolean;
  noInstagram?: boolean;
  noFacebook?: boolean;
  noLinkedin?: boolean;
  noSocials?: boolean;
  independentOnly?: boolean;
  hasContactForm?: boolean;
  /** "Old-school" / "needs redesign" / "slow loading" — drives PageSpeed enrichment. */
  slowWebsite?: boolean;

  // ─── Quality signals ─────────────────────────────────────────────────────
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  maxReviews?: number;
  minPagespeed?: number;
  maxPagespeed?: number;

  // ─── Hiring / intent ─────────────────────────────────────────────────────
  hiringSignal?: boolean;
  hiringRole?: string;
  hiringWindow?: "24h" | "7d" | "30d" | "any";
  seniorityLevel?: (
    | "entry"
    | "associate"
    | "mid_senior"
    | "director"
    | "executive"
  )[];
  workArrangement?: ("on_site" | "remote" | "hybrid")[];
  salaryFloor?: number;

  // ─── Discovery surfaces ──────────────────────────────────────────────────
  /** "Product Hunt", "Substack", "Yelp", "Trustpilot" — names a specific source. */
  source?:
    | "google_maps"
    | "google_serp"
    | "linkedin_jobs"
    | "linkedin_profiles"
    | "producthunt"
    | "yelp"
    | "substack"
    | "trustpilot";

  /** Talent / people-as-leads signal — drives the talent_sourcing intent. */
  talentSignal?: boolean;
  /** Reviews / reputation pull signal — drives the reviews_* intents. */
  reviewsAudit?: boolean;

  // ─── Outreach ────────────────────────────────────────────────────────────
  /** When true, user wants to SUBMIT messages, not just collect leads. */
  submitOutreach?: boolean;
  outreach?: {
    senderName: string;
    senderEmail: string;
    subject?: string;
    message: string;
    senderPhone?: string;
    senderCompany?: string;
    senderWebsite?: string;
    takeScreenshots?: boolean;
  };
}

/** Status of a strategy's prerequisites — used to surface gates in the UI. */
export type StrategyAvailability =
  | { ready: true }
  | { ready: false; reason: string; missingEnv?: string[] };

export interface Strategy {
  /** Stable identifier. Used in the decision function's pick + the docs. */
  id: string;
  /** Human-readable label for the IntentPreview / capabilities page. */
  label: string;
  /**
   * What this strategy does in plain English. Surfaced to the user in
   * the IntentPreview so they understand WHY this actor was picked.
   */
  rationale: string;
  /**
   * Trigger phrases — used by the decision function as a hint when the
   * deterministic logic is ambiguous. These are also fed into the AI
   * router prompt as few-shot examples.
   */
  triggers: string[];
  /**
   * A complete, copy-pasteable user prompt that should resolve to this
   * strategy. Surfaced on the public /capabilities/strategies page as a
   * one-click "Try this" CTA. Should read like real customer language.
   */
  samplePrompt: string;
  /**
   * Hard filter requirements — at least ALL of these must be true on the
   * ParsedFilters input for this strategy to be eligible.
   */
  requires?: Partial<ParsedFilters>;
  /**
   * Strategy's confidence score when it matches. The decision function
   * picks the highest-priority eligible strategy. Higher = more specific.
   */
  priority: number;
  /**
   * Build the recipe (sequence of leaf tasks) for given filters. Composes
   * the actor + enrichments + cost.
   */
  buildRecipe: (filters: ParsedFilters) => RecipeStep[];
  /**
   * Static availability check — does this strategy have its env keys?
   * Strategies needing PAGESPEED_API_KEY / SERPAPI_KEY / etc. report it
   * here so the IntentPreview can surface a setup hint.
   */
  available: () => StrategyAvailability;
}
