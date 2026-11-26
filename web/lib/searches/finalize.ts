/**
 * Shared search-finalization logic. Both the Apify webhook handler and the
 * cron sweep call this — keeps the two paths consistent.
 */
import "server-only";
import { adminSupabase } from "@/lib/db/admin";
import { getRunDataset } from "@/lib/apify/runner";
import { normalizeRow } from "@/lib/normalize";
import {
  applyPostFilters,
  type PostFilters,
} from "@/lib/normalize/post-filters";
import { grantCreditsAdmin } from "@/lib/billing/credits";
import { enrichSearchLeads } from "@/lib/enrichment/orchestrator";
import { emitProgress } from "@/lib/searches/progress";
import type { Intent } from "@/lib/apify/actors";
import type { NormalizedLead } from "@/lib/normalize/types";
import {
  actualOutreachCost,
  type OutreachReceipt,
} from "@/lib/billing/outreach-pricing";

export interface FinalizeSucceededInput {
  searchId: string;
  accountId: string;
  intent: Intent;
  datasetId: string;
}

export interface FinalizeFailedInput {
  searchId: string;
  accountId: string;
  creditsEstimated: number;
  creditsSpent: number;
  reason: string;
}

export interface FinalizeResult {
  ok: boolean;
  leadCount?: number;
  refunded?: number;
  error?: string;
}

export async function finalizeSucceeded(
  opts: FinalizeSucceededInput,
): Promise<FinalizeResult> {
  const supabase = adminSupabase();
  const isOutreach = opts.intent === "contact_form_submit";
  await supabase
    .from("searches")
    .update({ status: "normalizing" })
    .eq("id", opts.searchId);
  await emitProgress(opts.searchId, {
    phase: "normalizing",
    step: "Pulling raw rows from the actor dataset…",
    log: "Actor finished — fetching dataset",
  });

  // Look up post-filters declared at routing time so we can apply them
  // before lead upsert.
  const { data: searchPreCheck } = await supabase
    .from("searches")
    .select("post_filters, credits_spent, outreach")
    .eq("id", opts.searchId)
    .maybeSingle();
  const postFilters =
    (searchPreCheck?.post_filters as PostFilters | null | undefined) ?? null;
  // Outreach reconciliation inputs: what was reserved upfront + whether
  // screenshots were on (a per-submission add-on).
  const reservedCredits = (searchPreCheck?.credits_spent as number | null) ?? 0;
  const screenshots = Boolean(
    (searchPreCheck?.outreach as { takeScreenshots?: boolean } | null)
      ?.takeScreenshots,
  );

  const rows = await getRunDataset(opts.datasetId);
  await emitProgress(opts.searchId, {
    scraped: rows.length,
    step: `Normalizing ${rows.length} candidates from the actor…`,
  });

  // normalizeRow returns 0..N leads per Apify row (SERP rows fan out).
  const allNormalized = rows.flatMap((r) => normalizeRow(opts.intent, r));

  const normalized = applyPostFilters(allNormalized, postFilters);
  await emitProgress(opts.searchId, {
    normalized: normalized.length,
    step:
      normalized.length === 0
        ? "Actor succeeded but post-filters dropped every row."
        : `Filtered down to ${normalized.length} matching ${normalized.length === 1 ? "lead" : "leads"}.`,
    log: `Post-filter kept ${normalized.length} of ${allNormalized.length}`,
  });

  if (normalized.length === 0) {
    await supabase
      .from("searches")
      .update({
        status: "completed",
        lead_count: 0,
        ...(isOutreach
          ? {
              outcome_counts: {
                delivered: 0,
                blocked: 0,
                no_form: 0,
                failed: 0,
                total: 0,
              },
            }
          : {}),
        completed_at: new Date().toISOString(),
        status_reason: "Actor succeeded but produced no leads.",
      })
      .eq("id", opts.searchId);
    // Nothing landed → refund the full reservation.
    if (isOutreach) {
      await reconcileOutreachCredits({
        supabase,
        searchId: opts.searchId,
        accountId: opts.accountId,
        actual: 0,
        reserved: reservedCredits,
      });
    }
    return { ok: true, leadCount: 0 };
  }

  const inserts = normalized.map((lead) => ({
    account_id: opts.accountId,
    search_id: opts.searchId,
    business_name: lead.business_name,
    contact_name: lead.contact_name,
    category: lead.category,
    categories: lead.categories,
    address: lead.address,
    city: lead.city,
    region: lead.region,
    country: lead.country,
    postal_code: lead.postal_code,
    lat: lead.lat,
    lng: lead.lng,
    website: lead.website,
    google_maps_url: lead.google_maps_url,
    place_id: lead.place_id,
    lead_score: lead.lead_score,
    source_url: lead.source_url,
    emails: lead.emails,
    phones: lead.phones,
    socials: lead.socials as never,
    rating: lead.rating,
    review_count: lead.review_count,
    hours: lead.hours as never,
    description: lead.description,
    raw: lead.raw as never,
    dedupe_key: lead.dedupe_key,
    enrichment_state: "pending" as const,
  }));

  const { error: upsertError, count } = await supabase
    .from("leads")
    .upsert(inserts, {
      onConflict: "account_id,dedupe_key",
      ignoreDuplicates: false,
      count: "exact",
    });

  if (upsertError) {
    await supabase
      .from("searches")
      .update({
        status: "failed",
        status_reason: `Lead upsert failed: ${upsertError.message}`,
      })
      .eq("id", opts.searchId);
    return { ok: false, error: upsertError.message };
  }

  const leadCount = count ?? normalized.length;
  await supabase
    .from("searches")
    .update({
      lead_count: leadCount,
      ...(isOutreach ? { outcome_counts: outcomeCountsFor(normalized) } : {}),
      completed_at: new Date().toISOString(),
    })
    .eq("id", opts.searchId);

  // Reconcile outreach credits: charge only for delivered submissions
  // (+ add-ons), refund the rest of the upfront reservation.
  if (isOutreach) {
    const actual = actualOutreachCost(
      normalized.map((l) => l.raw as OutreachReceipt),
      { screenshots },
    );
    await reconcileOutreachCredits({
      supabase,
      searchId: opts.searchId,
      accountId: opts.accountId,
      actual,
      reserved: reservedCredits,
    });
  }

  // AI-annotate any leads that weren't already annotated by the
  // streaming poll path (covers the webhook-only case where the user
  // closed the tab before polling could finish). Best-effort: a Haiku
  // failure just leaves the row unannotated.
  // Pulled into a sibling helper so finalize stays focused on
  // status-transition + enrichment-orchestration.
  await annotateUnannotatedLeads({
    supabase,
    searchId: opts.searchId,
    accountId: opts.accountId,
  });

  // Kick off enrichment inline (bounded). Cron sweep handles the tail for
  // searches that exceed the inline budget.
  const { data: searchRow } = await supabase
    .from("searches")
    .select("enrich_email, enrich_socials")
    .eq("id", opts.searchId)
    .maybeSingle();

  await emitProgress(opts.searchId, {
    phase: "enriching",
    step: "Validating emails, normalizing phones, and discovering socials…",
    log: `Inserted ${leadCount} leads — starting enrichment`,
  });

  await enrichSearchLeads({
    searchId: opts.searchId,
    accountId: opts.accountId,
    enrichEmail: searchRow?.enrich_email ?? true,
    enrichSocials: searchRow?.enrich_socials ?? true,
  });

  await emitProgress(opts.searchId, {
    phase: "completed",
    step: `Done — ${leadCount} ${leadCount === 1 ? "lead" : "leads"} ready to use.`,
    eta_secs: 0,
    log: "Enrichment complete",
  });

  return { ok: true, leadCount };
}

/**
 * Roll up submission outcomes for a contact-form campaign from the
 * normalized receipts. Cached on searches.outcome_counts so the dashboard
 * + campaign list don't rescan leads.raw on every render.
 */
function outcomeCountsFor(normalized: NormalizedLead[]): {
  delivered: number;
  blocked: number;
  no_form: number;
  failed: number;
  total: number;
} {
  let delivered = 0,
    blocked = 0,
    no_form = 0,
    failed = 0;
  for (const lead of normalized) {
    const status = (lead.raw as Record<string, unknown> | null)?.[
      "submission_status"
    ];
    if (status === "success" || status === "chatbot_sent") delivered++;
    else if (status === "captcha_blocked") blocked++;
    else if (status === "no_channel") no_form++;
    else failed++;
  }
  return { delivered, blocked, no_form, failed, total: normalized.length };
}

/**
 * Reconcile an outreach campaign's credits: the actual charge is only the
 * delivered submissions (+ add-ons); refund the unused part of the upfront
 * reservation. Idempotent two ways — it rewrites credits_spent to `actual`
 * (so a re-run reads reserved == actual → refund 0) AND skips if a refund
 * ledger entry for this search already exists.
 */
async function reconcileOutreachCredits(opts: {
  supabase: ReturnType<typeof adminSupabase>;
  searchId: string;
  accountId: string;
  actual: number;
  reserved: number;
}): Promise<void> {
  const refund = Math.max(0, opts.reserved - opts.actual);
  // Record the true net charge for accurate reporting.
  await opts.supabase
    .from("searches")
    .update({ credits_spent: opts.actual })
    .eq("id", opts.searchId);
  if (refund <= 0) return;
  // Don't double-refund if finalize runs twice (webhook + cron sweep).
  const { data: existingRefund } = await opts.supabase
    .from("credit_ledger")
    .select("id")
    .eq("ref_id", opts.searchId)
    .eq("reason", "refund")
    .limit(1)
    .maybeSingle();
  if (existingRefund) return;
  await grantCreditsAdmin({
    accountId: opts.accountId,
    amount: refund,
    reason: "refund",
    refKind: "search",
    refId: opts.searchId,
    metadata: {
      kind: "outreach_reconcile",
      reserved: opts.reserved,
      actual: opts.actual,
    },
  });
}

/**
 * Native (Trigger.dev) outreach finalizer — the missing counterpart to the
 * Apify path's finalizeSucceeded tail. The native poll route upserts leads
 * as runs complete, then just flipped status=completed and stopped, so it
 * NEVER wrote outcome_counts and NEVER reconciled the upfront reservation —
 * overcharging every native campaign by (reserved − delivered).
 *
 * This reads the campaign's already-upserted leads, writes outcome_counts,
 * and reconciles credits against the actual delivered cost. Idempotent:
 * reconcileOutreachCredits rewrites credits_spent to actual and guards the
 * refund ledger, so calling it again is a no-op.
 */
export async function finalizeNativeOutreach(opts: {
  searchId: string;
  accountId: string;
  screenshots: boolean;
}): Promise<{ delivered: number; total: number }> {
  const supabase = adminSupabase();

  const { data: leadRows } = await supabase
    .from("leads")
    .select("raw")
    .eq("search_id", opts.searchId)
    .eq("account_id", opts.accountId);

  // outcomeCountsFor + actualOutreachCost only read `.raw.submission_status`
  // (+ add-on flags), so the stored receipt JSON is all we need.
  const rows = (leadRows ?? []).map((r) => ({ raw: r.raw }) as NormalizedLead);
  const counts = outcomeCountsFor(rows);

  const { data: search } = await supabase
    .from("searches")
    .select("credits_spent")
    .eq("id", opts.searchId)
    .maybeSingle();
  const reserved = (search?.credits_spent as number | null) ?? 0;

  await supabase
    .from("searches")
    .update({ outcome_counts: counts })
    .eq("id", opts.searchId);

  const actual = actualOutreachCost(
    rows.map((l) => l.raw as OutreachReceipt),
    { screenshots: opts.screenshots },
  );
  await reconcileOutreachCredits({
    supabase,
    searchId: opts.searchId,
    accountId: opts.accountId,
    actual,
    reserved,
  });

  return { delivered: counts.delivered, total: counts.total };
}

export async function finalizeFailed(
  opts: FinalizeFailedInput,
): Promise<FinalizeResult> {
  const supabase = adminSupabase();
  const refundAmount = Math.max(opts.creditsEstimated - opts.creditsSpent, 0);

  if (refundAmount > 0) {
    await grantCreditsAdmin({
      accountId: opts.accountId,
      amount: refundAmount,
      reason: "refund",
      refKind: "search",
      refId: opts.searchId,
      metadata: { reason: opts.reason },
    });
  }

  await supabase
    .from("searches")
    .update({
      status: "failed",
      status_reason: opts.reason,
      completed_at: new Date().toISOString(),
    })
    .eq("id", opts.searchId);

  return { ok: true, refunded: refundAmount };
}

/**
 * Annotate any leads on this search that don't already have an
 * `ai_fit_summary`. Used at finalize-time to catch leads inserted via
 * the webhook path before the streaming poll loop could pick them up
 * (happens when the user closes the tab mid-run).
 *
 * Reads the search's prompt + resolved filters so Haiku judges fit
 * against what we ACTUALLY filtered on, not the verbatim raw prompt.
 * (Without this, summaries come back as "doesn't match" even though
 * the lead is in the result set — caught in prod May 13.)
 */
async function annotateUnannotatedLeads(opts: {
  supabase: ReturnType<typeof adminSupabase>;
  searchId: string;
  accountId: string;
}): Promise<void> {
  const { supabase, searchId, accountId } = opts;
  const { data: search } = await supabase
    .from("searches")
    .select("prompt, post_filters")
    .eq("id", searchId)
    .maybeSingle();
  if (!search?.prompt) return;

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "dedupe_key, business_name, category, categories, city, rating, review_count, website, emails, phones, description, enrichment_meta",
    )
    .eq("search_id", searchId)
    .eq("account_id", accountId);
  if (!leads || leads.length === 0) return;

  // Re-annotate rows whose existing summary was generated by the
  // pre-fix annotator that contradicted the resolver (the May-13 bug
  // that produced "doesn't match your criteria" summaries even when
  // the lead was in the result set). The pattern catches those bad
  // strings without false-positiving on legitimate summaries.
  const isStaleSummary = (s: string | undefined): boolean => {
    if (!s) return true;
    return /doesn'?t match|doesn'?t fit|not a fit|does not match|but has? website|but does have a website|no.?website requirement/i.test(
      s,
    );
  };
  const needsAnnotation = leads.filter((l) => {
    const meta = l.enrichment_meta as { ai_fit_summary?: string } | null;
    return isStaleSummary(meta?.ai_fit_summary);
  });
  if (needsAnnotation.length === 0) return;

  // Lazy-import to avoid pulling Anthropic SDK into the cron-only code
  // paths when ANTHROPIC_API_KEY isn't set.
  const { annotateLeadsBatch } = await import("@/lib/ai/annotate-lead");
  const postFilters =
    (search.post_filters as PostFilters | null | undefined) ?? null;
  const contradictions =
    (
      (postFilters as unknown as {
        _contradictions?: import("@/lib/normalize/post-filters-resolve").PostFilterContradiction[];
      } | null) ?? {}
    )._contradictions ?? [];

  try {
    const summaries = await annotateLeadsBatch(
      search.prompt as string,
      needsAnnotation.map((l) => ({
        dedupe_key: l.dedupe_key as string,
        business_name: l.business_name as string,
        category: l.category as string | null,
        categories: (l.categories as string[] | null) ?? [],
        city: l.city as string | null,
        rating: l.rating as number | null,
        review_count: l.review_count as number | null,
        website: l.website as string | null,
        emails: (l.emails as string[] | null) ?? [],
        phones: (l.phones as string[] | null) ?? [],
        description: l.description as string | null,
      })),
      { resolvedFilters: postFilters, contradictions },
    );
    await Promise.allSettled(
      Array.from(summaries.entries()).map(([dedupe_key, ai_fit_summary]) =>
        supabase
          .from("leads")
          .update({ enrichment_meta: { ai_fit_summary } })
          .eq("account_id", accountId)
          .eq("dedupe_key", dedupe_key),
      ),
    );
  } catch {
    // Annotation is best-effort. Never block finalize on it.
  }
}
