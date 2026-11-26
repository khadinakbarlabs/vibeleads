"use server";

/**
 * Cancel an in-flight search.
 *
 * Three things happen on cancel:
 *   1. Apify run is aborted (so we stop paying for actor compute +
 *      proxy bandwidth immediately).
 *   2. Search status flips to `canceled` so the UI swaps from the
 *      progress overlay to the (partial) results view + the
 *      realtime broadcast lands the change instantly.
 *   3. Credits are refunded for the un-spent budget: estimate minus
 *      what we already charged. Any rows the streaming poll already
 *      inserted stay in the user's account — they're real leads and
 *      they cost real credits.
 *
 * Authorization: caller must own the search row (RLS-checked via
 * `requireAccount`). All three side effects are best-effort and
 * idempotent — calling cancel twice is safe.
 */
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { abortRun } from "@/lib/apify/runner";
import { cancelNativeOutreachBatch } from "@/lib/searches/cancel-native-outreach";
import { grantCreditsAdmin } from "@/lib/billing/credits";

const ALREADY_TERMINAL = new Set(["completed", "failed", "canceled"]);

export interface CancelSearchResult {
  ok: boolean;
  status?: string;
  refunded?: number;
  error?: string;
}

export async function cancelSearch(
  searchId: string,
): Promise<CancelSearchResult> {
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { data: search } = await supabase
    .from("searches")
    .select(
      "id, status, actor_run_id, credits_estimated, credits_spent, lead_count",
    )
    .eq("id", searchId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!search) {
    return { ok: false, error: "Search not found" };
  }

  if (ALREADY_TERMINAL.has(search.status as string)) {
    return { ok: true, status: search.status as string, refunded: 0 };
  }

  // 1. Stop the upstream worker — best-effort, idempotent. Three cases
  // on actor_run_id:
  //   - `trigger:<batchId>` → native outreach via Trigger.dev: cancel
  //                            every non-terminal run in the batch
  //   - `native:<uuid>`     → local-only path (run-native-maps), no
  //                            upstream worker to abort
  //   - everything else     → legacy Apify actor run
  const actorRunId =
    typeof search.actor_run_id === "string" ? search.actor_run_id : null;
  if (actorRunId?.startsWith("trigger:")) {
    const batchId = actorRunId.slice("trigger:".length);
    try {
      await cancelNativeOutreachBatch(batchId);
    } catch {
      // Trigger.dev unreachable — local flip below is still the gate.
    }
  } else if (actorRunId && !actorRunId.startsWith("native:")) {
    try {
      await abortRun(actorRunId);
    } catch {
      // Apify returned non-200 — likely already terminal. Continue;
      // the local state flip is what gates UI access.
    }
  }

  // 2. Refund credits — only the portion we estimated but didn't yet
  // charge. The streaming poll's per-lead inserts spend credits as
  // they go (in the production path), so we refund the gap.
  const estimated = (search.credits_estimated as number) ?? 0;
  const spent = (search.credits_spent as number) ?? 0;
  const refund = Math.max(estimated - spent, 0);
  if (refund > 0) {
    try {
      await grantCreditsAdmin({
        accountId,
        amount: refund,
        reason: "refund",
        refKind: "search",
        refId: search.id as string,
        metadata: { trigger: "user_cancel" },
      });
    } catch {
      // Don't block the cancel on a refund failure — we'd rather
      // the user see the cancel succeed and reconcile credits
      // manually than be stuck in a half-cancelled state.
    }
  }

  // 3. Flip the search row. This UPDATE triggers the realtime
  // broadcast that the LiveProgressShell + SearchProgress are
  // subscribed to, so the UI swaps to terminal-state within a
  // round-trip.
  await supabase
    .from("searches")
    .update({
      status: "canceled",
      status_reason: "Canceled by user",
      completed_at: new Date().toISOString(),
    })
    .eq("id", search.id);

  return { ok: true, status: "canceled", refunded: refund };
}
