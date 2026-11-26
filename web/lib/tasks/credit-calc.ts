/**
 * Credit calculator. Given a recipe (list of tasks + quantities), returns:
 *   - total credits the user pays
 *   - total upstream cost (COGS) we pay
 *   - projected gross margin %
 *   - per-task breakdown for transparent UI
 *
 * The math here is the SINGLE SOURCE OF TRUTH for credit pricing. Both
 * `estimateSearchCredits` (preflight) and the actual ledger debits should
 * route through this.
 */
import { findTask, type Task } from "./registry";

export interface RecipeStep {
  taskId: string;
  /** Quantity — interpretation depends on task.unit (per_result, per_email, etc). */
  qty: number;
}

export interface RecipeCost {
  /** Per-step breakdown so the UI can render a transparent table. */
  breakdown: Array<{
    task: Task;
    qty: number;
    unitCredits: number;
    unitCostUsd: number;
    totalCredits: number;
    totalCostUsd: number;
  }>;
  /** Sum of credits across all steps. Round up to integer at the end. */
  totalCredits: number;
  /** Sum of upstream cost across all steps in USD. */
  totalCostUsd: number;
  /** Sell rate applied — kept here so the UI can echo it back to the user. */
  creditPriceUsd: number;
  /** projected margin = (revenue - cogs) / revenue. */
  projectedMarginPct: number;
}

/** Anchor: $0.04 per credit at the floor sell tier (PRICING.md). */
const CREDIT_PRICE_USD = 0.04;

/**
 * Cost a recipe. Unknown task ids are silently skipped (logged in a debug
 * field if needed) — preferring tolerant behaviour over fail-closed since
 * a missing task in the registry shouldn't block a search.
 */
export function costRecipe(steps: RecipeStep[]): RecipeCost {
  const breakdown: RecipeCost["breakdown"] = [];
  let totalCredits = 0;
  let totalCostUsd = 0;

  for (const step of steps) {
    const task = findTask(step.taskId);
    if (!task) continue;
    const qty = Math.max(0, Math.floor(step.qty));
    if (qty === 0) continue;
    const stepCredits = task.credits * qty;
    const stepCostUsd = task.costUsd * qty;
    breakdown.push({
      task,
      qty,
      unitCredits: task.credits,
      unitCostUsd: task.costUsd,
      totalCredits: stepCredits,
      totalCostUsd: stepCostUsd,
    });
    totalCredits += stepCredits;
    totalCostUsd += stepCostUsd;
  }

  // Round credits UP to the next integer so the user never gets a fractional charge.
  const totalCreditsRounded = Math.ceil(totalCredits);
  const revenue = totalCreditsRounded * CREDIT_PRICE_USD;
  const projectedMarginPct =
    revenue > 0 ? Math.round(((revenue - totalCostUsd) / revenue) * 100) : 0;

  return {
    breakdown,
    totalCredits: totalCreditsRounded,
    totalCostUsd,
    creditPriceUsd: CREDIT_PRICE_USD,
    projectedMarginPct,
  };
}

/**
 * Convenience: given the parsed router output (intent + actor input + post
 * filters + enrichment toggles), return the recipe steps the search will
 * actually run. This is the bridge from the AI layer to the cost layer.
 */
export function buildRecipe(opts: {
  intent: string;
  maxResults: number;
  enrichEmail: boolean;
  enrichSocials: boolean;
  enrichPagespeed?: boolean;
  takeScreenshots?: boolean;
  /** Best-guess of how many leads will end up with a website (drives social + PSI volume). */
  estWithWebsite?: number;
  /** Best-guess of how many emails the actor will return up-front (gmaps_leads / contact_form). */
  estEmailsFound?: number;
}): RecipeStep[] {
  const steps: RecipeStep[] = [];

  // Routing always runs.
  steps.push({ taskId: "routing.parse_prompt", qty: 1 });

  // Scrape — pick the right task per intent.
  const max = Math.max(1, opts.maxResults);
  const withWebsite = opts.estWithWebsite ?? Math.floor(max * 0.7);
  const emailsFound = opts.estEmailsFound ?? Math.floor(max * 0.4);

  switch (opts.intent) {
    case "local_business":
      steps.push({ taskId: "scrape.gmaps.basic", qty: max });
      break;
    case "gmaps_leads":
      steps.push({ taskId: "scrape.gmaps.with_email", qty: max });
      break;
    case "web_serp":
      steps.push({ taskId: "scrape.serp", qty: max });
      break;
    case "contact_form":
      steps.push({ taskId: "scrape.contact_details", qty: max });
      break;
    case "hiring_intent":
      steps.push({ taskId: "scrape.linkedin_jobs", qty: max });
      break;
    case "producthunt":
      steps.push({ taskId: "scrape.producthunt.basic", qty: max });
      if (opts.enrichEmail) {
        steps.push({
          taskId: "scrape.producthunt.email_found",
          qty: emailsFound,
        });
      }
      break;
    case "contact_form_submit":
      return []; // Historical campaigns have no new submission quote.
  }

  // Enrichment passes — only meaningful for lead-bearing intents.
  if (opts.intent !== "contact_form_submit") {
    // Phone normalize is free but counted so the breakdown shows it.
    steps.push({ taskId: "enrich.phone.libphonenumber", qty: max });

    if (opts.enrichEmail) {
      // Default to EmailListVerify (cheapest stage). Real selection depends
      // on which validator key is set; the calculator approximates with ELV.
      steps.push({ taskId: "enrich.email.elv", qty: emailsFound });
    }

    if (opts.enrichSocials && withWebsite > 0) {
      steps.push({ taskId: "enrich.socials.scrape", qty: withWebsite });
    }

    if (opts.enrichPagespeed && withWebsite > 0) {
      steps.push({ taskId: "enrich.pagespeed", qty: withWebsite });
    }
  }

  return steps;
}

/** Format a USD figure to 4 decimals (the breakdown table uses this). */
export function fmtUsd(amount: number): string {
  if (amount === 0) return "$0";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
