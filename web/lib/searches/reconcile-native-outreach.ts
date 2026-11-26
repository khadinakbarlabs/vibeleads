/**
 * Durable reconciler for a native Trigger.dev outreach batch.
 *
 * It is deliberately independent of a browser request: both the live poll
 * route and the scheduled sweep call the same function. That gives every
 * terminal task state a receipt, keeps lead totals accurate, and finalizes a
 * campaign even when the user closes the tab mid-run.
 */
import "server-only";
import { adminSupabase } from "@/lib/db/admin";
import { grantCreditsAdmin } from "@/lib/billing/credits";
import { serverEnv } from "@/lib/env.server";
import { cancelNativeOutreachBatch } from "@/lib/searches/cancel-native-outreach";
import { finalizeNativeOutreach } from "@/lib/searches/finalize";
import { emitProgress, type SearchProgress } from "@/lib/searches/progress";
import { syncNativeOutreachToLeads } from "@/lib/searches/sync-native-outreach";

const ACTIVE_SEARCH_STATUSES = [
  "queued",
  "routing",
  "running",
  "normalizing",
  "enriching",
] as const;

type NativeProgress = SearchProgress & {
  trigger_batch_id?: string | null;
  trigger_total?: number;
  trigger_runs_ingested?: string[];
};

export interface NativeOutreachCampaign {
  id: string;
  accountId: string;
  actorRunId: string;
  startedAt: string | null;
  creditsEstimated: number;
  creditsSpent: number;
  progress: NativeProgress | null;
  outreach: { takeScreenshots?: boolean } | null;
}

export interface ReconcileNativeOutreachResult {
  ok: boolean;
  done: boolean;
  status: "running" | "completed" | "canceled";
  newCount: number;
  totalCount: number;
  matched: number;
  terminalRuns: number;
  totalRuns: number;
  timedOut?: boolean;
  refunded?: number;
  error?: string;
}

function nativeBatchId(actorRunId: string): string | null {
  if (!actorRunId.startsWith("trigger:")) return null;
  const id = actorRunId.slice("trigger:".length);
  return id || null;
}

function currentProgress(campaign: NativeOutreachCampaign): NativeProgress {
  return campaign.progress ?? ({} as NativeProgress);
}

async function countCampaignLeads(
  searchId: string,
  accountId: string,
): Promise<number> {
  const { count, error } = await adminSupabase()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId)
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function baseResult(
  campaign: NativeOutreachCampaign,
  progress: NativeProgress,
): ReconcileNativeOutreachResult {
  return {
    ok: true,
    done: false,
    status: "running",
    newCount: 0,
    totalCount: 0,
    matched: 0,
    terminalRuns: 0,
    totalRuns:
      typeof progress.trigger_total === "number" ? progress.trigger_total : 0,
  };
}

async function cancelForRuntimeCap(
  campaign: NativeOutreachCampaign,
  ageSecs: number,
  result: ReconcileNativeOutreachResult,
): Promise<ReconcileNativeOutreachResult> {
  const batchId = nativeBatchId(campaign.actorRunId);
  if (batchId) {
    await cancelNativeOutreachBatch(batchId).catch(() => undefined);
  }

  const refund = Math.max(campaign.creditsEstimated - campaign.creditsSpent, 0);
  const reason = `Auto-stopped after ${serverEnv.MAX_RUNTIME_SECS}s runtime cap. Refunded ${refund} unspent credits.`;
  const { data: canceled, error } = await adminSupabase()
    .from("searches")
    .update({
      status: "canceled",
      status_reason: reason,
      completed_at: new Date().toISOString(),
      timed_out: true,
    })
    .eq("id", campaign.id)
    .in("status", [...ACTIVE_SEARCH_STATUSES])
    .select("id");

  if (error) {
    return { ...result, ok: false, error: error.message };
  }
  if (!canceled || canceled.length === 0) {
    // Another reconciler or an explicit user cancel reached the terminal
    // transition first. It owns any refund side effect.
    return { ...result, done: true, status: "canceled" };
  }

  if (refund > 0) {
    try {
      await grantCreditsAdmin({
        accountId: campaign.accountId,
        amount: refund,
        reason: "refund",
        refKind: "search",
        refId: campaign.id,
        metadata: {
          engine: "native",
          trigger: "runtime_cap",
          cap_secs: serverEnv.MAX_RUNTIME_SECS,
          elapsed_secs: ageSecs,
        },
      });
    } catch (error) {
      await adminSupabase()
        .from("searches")
        .update({ status_reason: `${reason} Refund ledger write failed.` })
        .eq("id", campaign.id);
      return {
        ...result,
        ok: false,
        done: true,
        status: "canceled",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  await emitProgress(campaign.id, {
    phase: "failed",
    step: "Campaign stopped by the runtime safety limit.",
    eta_secs: 0,
    log: `Native batch stopped after ${ageSecs}s`,
  });
  return {
    ...result,
    done: true,
    status: "canceled",
    timedOut: true,
    refunded: refund,
  };
}

export async function reconcileNativeOutreach(
  campaign: NativeOutreachCampaign,
): Promise<ReconcileNativeOutreachResult> {
  const progress = currentProgress(campaign);
  const initial = baseResult(campaign, progress);
  const batchId = nativeBatchId(campaign.actorRunId);
  if (!batchId || initial.totalRuns <= 0) {
    return {
      ...initial,
      ok: false,
      error: "Native campaign is missing its Trigger batch metadata.",
    };
  }

  if (campaign.startedAt) {
    const ageSecs = Math.floor(
      (Date.now() - new Date(campaign.startedAt).getTime()) / 1000,
    );
    if (ageSecs > serverEnv.MAX_RUNTIME_SECS) {
      return cancelForRuntimeCap(campaign, ageSecs, initial);
    }
  }

  const ingestedIds = Array.isArray(progress.trigger_runs_ingested)
    ? progress.trigger_runs_ingested
    : [];
  const sync = await syncNativeOutreachToLeads({
    searchId: campaign.id,
    accountId: campaign.accountId,
    batchId,
    totalRuns: initial.totalRuns,
    ingestedIds,
  });
  if (!sync.ok) {
    return { ...initial, error: sync.error ?? "trigger_sync_failed" };
  }

  // Re-count in the database rather than adding a local delta. This makes
  // concurrent cron/browser reconciliation idempotent and keeps the UI total
  // correct even when both observers see a terminal run at the same time.
  let totalCount: number;
  try {
    totalCount = await countCampaignLeads(campaign.id, campaign.accountId);
  } catch (error) {
    return {
      ...initial,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const nextIngested = Array.from(
    new Set([...ingestedIds, ...sync.newlyIngestedIds]),
  );
  const allDone = sync.completedRuns >= initial.totalRuns;

  await adminSupabase()
    .from("searches")
    .update({ lead_count: totalCount })
    .eq("id", campaign.id)
    .in("status", [...ACTIVE_SEARCH_STATUSES]);

  await emitProgress(campaign.id, {
    scraped: initial.totalRuns,
    normalized: totalCount,
    trigger_batch_id: batchId,
    trigger_runs_ingested: nextIngested,
    apify_run_status: allDone ? "SUCCEEDED" : "RUNNING",
    step: allDone
      ? `Finalizing ${totalCount} outreach receipt${totalCount === 1 ? "" : "s"}…`
      : `Submitting outreach — ${sync.completedRuns}/${initial.totalRuns} done…`,
  });

  const result: ReconcileNativeOutreachResult = {
    ok: true,
    done: allDone,
    status: allDone ? "completed" : "running",
    newCount: sync.newCount,
    totalCount,
    matched: sync.successCount,
    terminalRuns: sync.completedRuns,
    totalRuns: initial.totalRuns,
  };
  if (!allDone) return result;

  try {
    await finalizeNativeOutreach({
      searchId: campaign.id,
      accountId: campaign.accountId,
      screenshots: campaign.outreach?.takeScreenshots === true,
    });
  } catch (error) {
    // Keep the campaign non-terminal so a later sweep retries billing and
    // outcome reconciliation. The terminal task data remains safely upserted.
    return {
      ...result,
      ok: false,
      done: false,
      status: "running",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const { error: completeError } = await adminSupabase()
    .from("searches")
    .update({
      status: "completed",
      lead_count: totalCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)
    .in("status", [...ACTIVE_SEARCH_STATUSES]);
  if (completeError) {
    return {
      ...result,
      ok: false,
      done: false,
      status: "running",
      error: completeError.message,
    };
  }

  await emitProgress(campaign.id, {
    phase: "completed",
    step: `Done — ${totalCount} outreach receipt${totalCount === 1 ? "" : "s"} recorded.`,
    eta_secs: 0,
  });
  return result;
}
