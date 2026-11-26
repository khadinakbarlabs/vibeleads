/**
 * Stream-mode dataset → leads upserter.
 *
 * Both the cron-fed `finalizeSucceeded` path AND the live-polling
 * `/api/sync/[searchId]/poll` route call this. The Apify Dataset API
 * starts populating items as the actor scrapes, so we can pull
 * partial results mid-run and upsert them into the leads table. The
 * existing realtime broadcast on the leads channel then pushes each
 * INSERT to the user's grid the moment the row lands.
 *
 * Idempotency: upsert is keyed on `(account_id, dedupe_key)` so
 * re-polling the same dataset is safe — duplicate rows just UPDATE
 * the existing leads with whatever the actor has accumulated.
 *
 * Returns the count of NEW leads (not already in the DB) so the caller
 * can decide whether to emit a progress update.
 */
import { adminSupabase } from "@/lib/db/admin";
import { getRunDatasetPage } from "@/lib/apify/runner";
import { normalizeRow } from "@/lib/normalize";
import {
  applyPostFilters,
  type PostFilters,
} from "@/lib/normalize/post-filters";
import { annotateLeadsBatch } from "@/lib/ai/annotate-lead";
import type { Intent } from "@/lib/apify/actors";
import type { NormalizedLead } from "@/lib/normalize/types";

export interface SyncDatasetInput {
  searchId: string;
  accountId: string;
  intent: Intent;
  datasetId: string;
  /** Dataset row offset already processed by the live poller. */
  offset?: number;
  /** Max rows to ingest per poll. Keeps Vercel sync ticks short. */
  pageSize?: number;
  /** Already-resolved post-filters (from the search row). */
  postFilters: PostFilters | null;
  /**
   * Original user prompt — passed to the lead annotator so the
   * one-line "fit summary" can reference the user's actual ask.
   * Optional: if absent, annotation is skipped.
   */
  prompt?: string | null;
}

export interface SyncDatasetResult {
  ok: boolean;
  /** Total items currently in the Apify dataset. */
  scraped: number;
  /** Offset to persist for the next live poll. */
  nextOffset: number;
  /** Items that passed post-filters this poll. */
  matched: number;
  /** Leads inserted that weren't already in the DB. */
  newCount: number;
  /** Cumulative lead count for this search after the upsert. */
  totalCount: number;
  /**
   * Of the MATCHED leads in the current poll, how many had at least
   * one email / phone / social handle. Used by the streaming poll
   * route to advance the "emails validated" / "socials found"
   * counters mid-run — the previous design left them at 0 until
   * `finalizeSucceeded` ran at the very end.
   */
  emailCount: number;
  phoneCount: number;
  socialsCount: number;
  error?: string;
}

/**
 * Pull the current Apify dataset, normalize, post-filter, and upsert
 * into leads. The live poller passes an offset so this processes only
 * newly appended rows. Replays are still safe because the upsert is keyed on
 * (account_id, dedupe_key).
 */
export async function syncDatasetToLeads(
  input: SyncDatasetInput,
): Promise<SyncDatasetResult> {
  const supabase = adminSupabase();

  // 1. Fetch only the rows appended since the last poll. This keeps the
  // real-time route fast on longer campaigns and avoids re-running AI
  // annotation checks over the same receipts every few seconds.
  let rows: unknown[];
  let scraped = 0;
  let nextOffset = Math.max(0, input.offset ?? 0);
  try {
    const page = await getRunDatasetPage(input.datasetId, {
      offset: input.offset ?? 0,
      limit: input.pageSize ?? 250,
    });
    rows = page.items;
    scraped = page.total;
    nextOffset = page.nextOffset;
  } catch (e) {
    return {
      ok: false,
      scraped: 0,
      nextOffset,
      matched: 0,
      newCount: 0,
      totalCount: 0,
      emailCount: 0,
      phoneCount: 0,
      socialsCount: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 2. Normalize + apply the search's resolved post-filters.
  const allNormalized: NormalizedLead[] = rows.flatMap((r) =>
    normalizeRow(input.intent, r),
  );
  const matched = applyPostFilters(allNormalized, input.postFilters);

  if (matched.length === 0) {
    // Nothing matched yet. Get the current cumulative count from the DB
    // so the caller can still emit a progress event.
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("search_id", input.searchId);
    return {
      ok: true,
      scraped,
      nextOffset,
      matched: 0,
      newCount: 0,
      totalCount: count ?? 0,
      emailCount: 0,
      phoneCount: 0,
      socialsCount: 0,
    };
  }

  // Count enrichment-bearing leads in this batch so the streaming poll
  // route can advance the "emails / socials" counters mid-run.
  const emailCount = matched.filter((l) => (l.emails?.length ?? 0) > 0).length;
  const phoneCount = matched.filter((l) => (l.phones?.length ?? 0) > 0).length;
  const socialsCount = matched.filter(
    (l) => l.socials && Object.keys(l.socials).length > 0,
  ).length;

  // 3. Find which dedupe keys are NEW so we can correctly report the
  // "new" count (upsert with ignoreDuplicates:false reports total
  // affected, not net-new). We need this distinction so the realtime
  // animations only fire on truly-new rows.
  const dedupeKeys = matched.map((l) => l.dedupe_key);
  const { data: existing } = await supabase
    .from("leads")
    .select("dedupe_key")
    .eq("account_id", input.accountId)
    .in("dedupe_key", dedupeKeys);
  const existingKeys = new Set(
    (existing ?? []).map((r) => r.dedupe_key as string),
  );
  const newCount = matched.filter(
    (l) => !existingKeys.has(l.dedupe_key),
  ).length;

  // 4. Build upsert payload (same shape as finalizeSucceeded — keep in
  // sync; if the leads schema grows, update both call sites).
  const inserts = matched.map((lead) => ({
    account_id: input.accountId,
    search_id: input.searchId,
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

  const { error: upsertError } = await supabase.from("leads").upsert(inserts, {
    onConflict: "account_id,dedupe_key",
    ignoreDuplicates: false,
  });

  if (upsertError) {
    return {
      ok: false,
      scraped,
      nextOffset,
      matched: matched.length,
      newCount,
      totalCount: 0,
      emailCount,
      phoneCount,
      socialsCount,
      error: upsertError.message,
    };
  }

  // 5. AI annotation. Runs for two classes of lead:
  //    a) NEW leads inserted this poll (newCount > 0)
  //    b) EXISTING leads that don't have an ai_fit_summary yet — this
  //       catches rows whose previous annotation was bad and got
  //       cleared (e.g. by the May-13 incident-response sql), so the
  //       next poll re-Haikus them with the fixed prompt.
  // Best-effort: a failure leaves the row unannotated (still useful).
  // Skipped entirely when there's no prompt (cron path) so we don't
  // burn Anthropic spend on backfills.
  if (input.prompt) {
    // Build the candidate list: new leads + existing leads with no
    // summary yet. We need to know which existing leads lack a
    // summary, so first probe enrichment_meta for the existingKeys
    // we already know about.
    const newLeads = matched.filter((l) => !existingKeys.has(l.dedupe_key));
    let backfillLeads: typeof matched = [];
    if (existingKeys.size > 0) {
      const { data: existingMeta } = await supabase
        .from("leads")
        .select("dedupe_key, enrichment_meta")
        .eq("account_id", input.accountId)
        .in("dedupe_key", Array.from(existingKeys));
      const unannotatedKeys = new Set(
        (existingMeta ?? [])
          .filter((r) => {
            const m = r.enrichment_meta as { ai_fit_summary?: string } | null;
            return !m?.ai_fit_summary;
          })
          .map((r) => r.dedupe_key as string),
      );
      backfillLeads = matched.filter((l) => unannotatedKeys.has(l.dedupe_key));
    }
    const toAnnotate = [...newLeads, ...backfillLeads];
    if (toAnnotate.length === 0) {
      // Skip the whole annotation block when there's nothing to do.
    } else {
      try {
        // The annotator MUST see the resolved filter set + any
        // contradictions the resolver auto-fixed. Without this, Haiku
        // reads the raw prompt and judges leads against criteria we
        // already decided to drop — every annotation comes back as
        // "doesn't match" even though the lead is in the result set.
        // Caught in prod May 13.
        const contradictions =
          (
            (input.postFilters as unknown as {
              _contradictions?: import("@/lib/normalize/post-filters-resolve").PostFilterContradiction[];
            } | null) ?? {}
          )._contradictions ?? [];
        const summaries = await annotateLeadsBatch(
          input.prompt,
          toAnnotate.map((l) => ({
            dedupe_key: l.dedupe_key,
            business_name: l.business_name,
            category: l.category,
            categories: l.categories,
            city: l.city,
            rating: l.rating,
            review_count: l.review_count,
            website: l.website,
            emails: l.emails,
            phones: l.phones,
            description: l.description,
          })),
          {
            resolvedFilters: input.postFilters,
            contradictions,
          },
        );
        // Fire-and-forget per-row UPDATEs in parallel. Each one
        // triggers a postgres_changes event the client will catch.
        const updates = Array.from(summaries.entries()).map(
          async ([dedupe_key, ai_fit_summary]) => {
            await supabase
              .from("leads")
              .update({
                enrichment_meta: { ai_fit_summary },
              })
              .eq("account_id", input.accountId)
              .eq("dedupe_key", dedupe_key);
          },
        );
        // We don't block the response on these — they fan out via the
        // realtime channel anyway. But we DO await to keep the
        // serverless function alive long enough for Vercel to flush
        // them. (Background work after `return` would be killed.)
        await Promise.allSettled(updates);
      } catch {
        // Annotation is best-effort. Never block the sync on it.
      }
    }
  }

  // 6. Read the cumulative search lead count so the caller can update
  // the search row + emit progress.
  const { count: totalCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("search_id", input.searchId);

  return {
    ok: true,
    scraped,
    nextOffset,
    matched: matched.length,
    newCount,
    totalCount: totalCount ?? 0,
    emailCount,
    phoneCount,
    socialsCount,
  };
}
