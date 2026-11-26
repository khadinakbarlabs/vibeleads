import "server-only";

/**
 * Outreach credit pricing — the SINGLE source of truth.
 *
 * Charging model (decided with the user):
 *   - Credits are charged ONLY for submissions that LAND (delivered).
 *     Failed, CAPTCHA-blocked, and no-form targets are never billed.
 *   - Each delivered submission = a base cost + any add-ons that were
 *     actually used on that submission (AI field-fill, AI message rewrite
 *     to fit a form's character limit, screenshot proof).
 *
 * Flow: reserve the worst case upfront at launch (so a balance can't go
 * negative mid-run), then reconcile at finalize — refund (reserved −
 * actual). See estimateOutreachCost (reservation) + actualOutreachCost
 * (charge) + the finalize reconciliation.
 *
 * Costs are in CREDITS and are placeholders until the actor's real Apify
 * cost-per-event is known. To hold ≥60–70% margin, set each so:
 *   margin = 1 − (apifyCostPerEventUsd / (credits × USD_PER_CREDIT))
 * i.e. credits ≥ apifyCostPerEventUsd / (USD_PER_CREDIT × (1 − targetMargin)).
 * Update OUTREACH_COST once PPE is provided — everything else reads from here.
 */
export const OUTREACH_COST = {
  /** Base: one delivered contact-form submission. */
  submission: 1,
  /** Add-on: AI filled custom fields the form required. */
  aiFields: 1,
  /** Add-on: AI rewrote the message to fit the form's character limit. */
  messageRewrite: 1,
  /** Add-on: captured a proof screenshot of the submission. */
  screenshot: 1,
} as const;

/** A submission receipt row (subset of the actor output we bill on). */
export interface OutreachReceipt {
  submission_status?: unknown;
  ai_generated_fields?: unknown;
  /** Actor sets this when it rewrote the message to fit a char limit. */
  message_rewritten?: unknown;
}

function usedAiFields(r: OutreachReceipt): boolean {
  return (
    Array.isArray(r.ai_generated_fields) && r.ai_generated_fields.length > 0
  );
}

/**
 * Worst-case reservation charged upfront at launch: assume every target
 * delivers and uses every applicable add-on. Always ≥ the eventual actual
 * charge, so the finalize reconciliation only ever refunds (never bills
 * more). Screenshot is the only campaign-level add-on known at launch.
 */
export function estimateOutreachCost(
  maxResults: number,
  opts: { screenshots: boolean },
): number {
  const perSubmission =
    OUTREACH_COST.submission +
    OUTREACH_COST.aiFields +
    OUTREACH_COST.messageRewrite +
    (opts.screenshots ? OUTREACH_COST.screenshot : 0);
  return Math.max(1, Math.round(maxResults * perSubmission));
}

/**
 * Actual charge computed from the receipts at finalize. Only delivered
 * ("success") submissions are billed; each adds its base + the add-ons it
 * actually used.
 */
export function actualOutreachCost(
  receipts: OutreachReceipt[],
  opts: { screenshots: boolean },
): number {
  let total = 0;
  for (const r of receipts) {
    if (
      r.submission_status !== "success" &&
      r.submission_status !== "chatbot_sent"
    )
      continue;
    total += OUTREACH_COST.submission;
    if (usedAiFields(r)) total += OUTREACH_COST.aiFields;
    if (r.message_rewritten === true) total += OUTREACH_COST.messageRewrite;
    if (opts.screenshots) total += OUTREACH_COST.screenshot;
  }
  return Math.round(total);
}
