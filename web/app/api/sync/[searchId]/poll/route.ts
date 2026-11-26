/**
 * Live mid-run dataset poll. The client polls this every 3-4s while a
 * search has status=running so the user sees leads appear in the grid
 * AS the actor scrapes them — instead of waiting 2-3 minutes for the
 * final webhook to fire and dump 12 rows at once.
 *
 * Flow:
 *   1. Auth + ownership check (caller must own the search row)
 *   2. If status is terminal, no-op (already finalized — return current state)
 *   3. Pull current Apify dataset, normalize, post-filter, upsert
 *   4. Update search.progress + lead_count so SearchProgress reflects reality
 *   5. Return counts; client uses `newCount > 0` to know to highlight rows
 *
 * Idempotency: safe to call repeatedly. The upsert in syncDatasetToLeads
 * is keyed on (account_id, dedupe_key) so re-polling never creates
 * duplicate rows.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { syncDatasetToLeads } from "@/lib/searches/sync-dataset";
import { reconcileNativeOutreach } from "@/lib/searches/reconcile-native-outreach";
import { emitProgress, type SearchProgress } from "@/lib/searches/progress";
import { serverEnv } from "@/lib/env.server";
import type { Intent } from "@/lib/apify/actors";
import type { PostFilters } from "@/lib/normalize/post-filters";

const TERMINAL = new Set(["completed", "failed", "canceled"]);

interface ApifyRunLookup {
  defaultDatasetId?: string;
  status?: string;
  statusMessage?: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> },
) {
  const { searchId } = await params;
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  // 1. Ownership + state check. RLS would catch a cross-account access
  // attempt, but we re-check status explicitly to short-circuit
  // post-terminal calls so we don't burn an Apify API request to
  // re-fetch the dataset of a completed run.
  const { data: search, error } = await supabase
    .from("searches")
    .select(
      "id, status, intent, actor_run_id, account_id, post_filters, lead_count, prompt, progress, started_at, credits_estimated, credits_spent, outreach",
    )
    .eq("id", searchId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error || !search) {
    return NextResponse.json(
      { ok: false, error: "search not found" },
      { status: 404 },
    );
  }

  if (TERMINAL.has(search.status as string)) {
    return NextResponse.json({
      ok: true,
      done: true,
      status: search.status,
      newCount: 0,
      totalCount: (search.lead_count as number) ?? 0,
    });
  }

  if (!search.actor_run_id) {
    // Routing phase — no actor run yet. Nothing to sync.
    return NextResponse.json({
      ok: true,
      done: false,
      status: search.status,
      newCount: 0,
      totalCount: (search.lead_count as number) ?? 0,
    });
  }

  // ─── Native outreach branch ───────────────────────────────────────────
  // `actor_run_id` is prefixed `trigger:<batchId>` for the in-house
  // Playwright + Claude engine. Its reconciler is shared with the scheduled
  // sweep, so this browser request only makes progress faster; it is not the
  // sole owner of campaign completion.
  const actorRunId = search.actor_run_id as string;
  if (actorRunId.startsWith("trigger:")) {
    const result = await reconcileNativeOutreach({
      id: search.id as string,
      accountId: search.account_id as string,
      actorRunId,
      startedAt: (search.started_at as string | null) ?? null,
      creditsEstimated: (search.credits_estimated as number) ?? 0,
      creditsSpent: (search.credits_spent as number) ?? 0,
      progress: search.progress as SearchProgress | null,
      outreach: search.outreach as { takeScreenshots?: boolean } | null,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }
  // ─── end native branch ───────────────────────────────────────────────

  // Runtime cap — auto-abort runs that exceed the platform wall-clock
  // budget. The user might've closed the tab without cancelling, or
  // the actor is in a degenerate slow state. Either way, we don't
  // want the run silently bleeding proxy bandwidth + Apify compute
  // for hours. The DB action mirrors what `cancelSearch` does, just
  // tagged as `timed_out: true` so the refund accounting can
  // distinguish it from a user-cancel.
  if (search.started_at) {
    const ageMs = Date.now() - new Date(search.started_at as string).getTime();
    const ageSecs = Math.floor(ageMs / 1000);
    if (ageSecs > serverEnv.MAX_RUNTIME_SECS) {
      // Best-effort abort on Apify side; don't block the response on
      // a 4xx (the run may have already finished a beat ago).
      const apifyToken = process.env.APIFY_TOKEN;
      if (apifyToken && search.actor_run_id) {
        try {
          await fetch(
            `https://api.apify.com/v2/actor-runs/${search.actor_run_id}/abort?token=${apifyToken}`,
            { method: "POST" },
          );
        } catch {
          // Network blip — the DB flip below is the real guard.
        }
      }
      // Refund unspent budget.
      const estimated = (search.credits_estimated as number) ?? 0;
      const spent = (search.credits_spent as number) ?? 0;
      const refund = Math.max(estimated - spent, 0);
      if (refund > 0) {
        try {
          const { grantCreditsAdmin } = await import("@/lib/billing/credits");
          await grantCreditsAdmin({
            accountId: search.account_id as string,
            amount: refund,
            reason: "refund",
            refKind: "search",
            refId: search.id as string,
            metadata: {
              trigger: "runtime_cap",
              cap_secs: serverEnv.MAX_RUNTIME_SECS,
              elapsed_secs: ageSecs,
            },
          });
        } catch {
          // Refund failure shouldn't block the abort; reconcile manually.
        }
      }
      await supabase
        .from("searches")
        .update({
          status: "canceled",
          status_reason: `Auto-stopped after ${serverEnv.MAX_RUNTIME_SECS}s runtime cap. Refunded ${refund} unspent credits.`,
          completed_at: new Date().toISOString(),
          timed_out: true,
        })
        .eq("id", search.id);
      return NextResponse.json({
        ok: true,
        done: true,
        status: "canceled",
        timedOut: true,
        refunded: refund,
        newCount: 0,
        totalCount: (search.lead_count as number) ?? 0,
      });
    }
  }

  // 2. Resolve the dataset id + latest run status. The dataset id is
  // cached inside progress JSON as soon as startRun returns, so the Apify
  // run lookup is mostly for current statusMessage visibility.
  const progress = search.progress as
    | (SearchProgress & {
        apify_dataset_id?: string | null;
        apify_dataset_offset?: number;
      })
    | null;
  let datasetId = progress?.apify_dataset_id ?? null;
  let runStatus: string | null = null;
  let runStatusMessage: string | null = null;
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    return NextResponse.json({
      ok: false,
      done: false,
      status: search.status,
      newCount: 0,
      totalCount: (search.lead_count as number) ?? 0,
      error: "apify_token_missing",
    });
  }
  try {
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${search.actor_run_id}?token=${apifyToken}`,
    );
    if (res.ok) {
      const j = (await res.json()) as { data?: ApifyRunLookup };
      datasetId = j.data?.defaultDatasetId ?? datasetId;
      runStatus = j.data?.status ?? null;
      runStatusMessage = j.data?.statusMessage ?? null;
    }
  } catch {
    // Network blip — skip this poll, the client will retry.
    return NextResponse.json({
      ok: false,
      done: false,
      status: search.status,
      newCount: 0,
      totalCount: (search.lead_count as number) ?? 0,
      error: "apify_lookup_failed",
    });
  }

  if (!datasetId) {
    return NextResponse.json({
      ok: true,
      done: false,
      status: search.status,
      newCount: 0,
      totalCount: (search.lead_count as number) ?? 0,
    });
  }

  // 3. Run the sync. Uses admin client server-side so RLS doesn't gate
  // the upsert; the ownership check above is the security boundary.
  const offset =
    progress?.apify_dataset_id === datasetId
      ? Math.max(0, progress?.apify_dataset_offset ?? 0)
      : 0;
  const result = await syncDatasetToLeads({
    searchId: search.id as string,
    accountId: search.account_id as string,
    intent: search.intent as Intent,
    datasetId,
    offset,
    pageSize: 250,
    postFilters: (search.post_filters as PostFilters | null) ?? null,
    // Pass the user's original prompt so the AI annotator can produce
    // a fit summary tailored to what the user actually asked for.
    prompt: (search.prompt as string | null) ?? null,
  });

  // 4. Mirror the totals onto the search row + emit a progress event
  // so the BreathingBar / counters advance. We now surface the
  // email + socials counts too — without them, the "emails
  // validated" / "socials found" counters in the loading screen
  // stayed at 0 until finalizeSucceeded ran at the very end.
  const actorStep =
    runStatusMessage && runStatusMessage.trim().length > 0
      ? runStatusMessage
      : null;
  if (result.ok && result.newCount > 0) {
    await supabase
      .from("searches")
      .update({ lead_count: result.totalCount })
      .eq("id", searchId);
    await emitProgress(searchId, {
      scraped: result.scraped,
      normalized: result.totalCount,
      enriched_emails: result.emailCount,
      enriched_socials: result.socialsCount,
      enriched_phones: result.phoneCount,
      apify_dataset_id: datasetId,
      apify_dataset_offset: result.nextOffset,
      apify_run_status: runStatus,
      apify_status_message: runStatusMessage,
      step:
        result.totalCount === 1
          ? "Got the first lead — keep going…"
          : `${result.totalCount} leads streamed in so far…`,
    });
  } else if (result.ok && result.scraped > 0) {
    // Even with 0 new this poll, surface the scrape count so the UI
    // shows the actor is making forward progress.
    await emitProgress(searchId, {
      scraped: result.scraped,
      apify_dataset_id: datasetId,
      apify_dataset_offset: result.nextOffset,
      apify_run_status: runStatus,
      apify_status_message: runStatusMessage,
      step:
        actorStep ?? `Scraped ${result.scraped} candidates — applying filters…`,
    });
  } else if (result.ok) {
    await emitProgress(searchId, {
      apify_dataset_id: datasetId,
      apify_dataset_offset: result.nextOffset,
      apify_run_status: runStatus,
      apify_status_message: runStatusMessage,
      ...(actorStep ? { step: actorStep } : {}),
    });
  }

  return NextResponse.json({
    ok: result.ok,
    done: false,
    status: search.status,
    newCount: result.newCount,
    totalCount: result.totalCount,
    scraped: result.scraped,
    matched: result.matched,
    nextOffset: result.nextOffset,
    apifyRunStatus: runStatus,
    apifyStatusMessage: runStatusMessage,
    error: result.error,
  });
}
