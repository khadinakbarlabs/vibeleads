/**
 * Cron sweep — fallback for searches that never received a webhook.
 *
 * Runs every ~5 minutes via the GitHub Actions workflow at
 * `.github/workflows/cron-sweep-runs.yml`. Finds searches stuck in an
 * in-progress state with an actor_run_id, polls Apify for the run status,
 * and finalizes if terminal.
 *
 * Why GitHub Actions instead of Vercel Cron: Vercel's Hobby plan caps
 * cron schedules at once-daily, which is too sparse for stuck-run
 * recovery (24h hold on credits would be unacceptable UX). GitHub
 * Actions has no such limit and is free.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>`. The GitHub
 * Actions workflow reads CRON_SECRET from repo secrets. For manual
 * trigger from CLI:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/sweep-runs
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase } from "@/lib/db/admin";
import { getRunSnapshot, isTerminal } from "@/lib/apify/runner";
import { finalizeSucceeded, finalizeFailed } from "@/lib/searches/finalize";
import { reconcileNativeOutreach } from "@/lib/searches/reconcile-native-outreach";
import { serverEnv } from "@/lib/env.server";
import type { Intent } from "@/lib/apify/actors";

// Always run on the Node runtime (we use node-only deps).
export const runtime = "nodejs";
// Don't cache — this is a side-effecting endpoint.
export const dynamic = "force-dynamic";
// Vercel Cron timeout limit (Pro: 300s; Hobby: 60s). Keep work bounded.
export const maxDuration = 60;

const IN_PROGRESS_STATUSES = [
  "queued",
  "routing",
  "running",
  "normalizing",
  "enriching",
] as const;

export async function GET(request: NextRequest) {
  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json(
      { error: "cron_secret_not_configured" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = adminSupabase();

  // Find candidate searches: in-progress, has run id, not touched recently.
  const cutoff = new Date(Date.now() - 60_000).toISOString(); // 1 min grace
  const { data: candidates, error } = await supabase
    .from("searches")
    .select(
      "id, account_id, intent, actor_run_id, credits_estimated, credits_spent, started_at, progress, outreach",
    )
    .in("status", [...IN_PROGRESS_STATUSES])
    .not("actor_run_id", "is", null)
    .lt("updated_at", cutoff)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidateRows = candidates ?? [];
  const summary = {
    swept: candidateRows.length,
    finalizedSuccess: 0,
    finalizedFailed: 0,
    reconciledNative: 0,
    stillRunning: 0,
    errors: [] as Array<{ id: string; message: string }>,
  };

  for (const c of candidateRows) {
    const actorRunId = String(c.actor_run_id);
    if (actorRunId.startsWith("trigger:")) {
      const result = await reconcileNativeOutreach({
        id: c.id as string,
        accountId: c.account_id as string,
        actorRunId,
        startedAt: (c.started_at as string | null) ?? null,
        creditsEstimated: (c.credits_estimated as number) ?? 0,
        creditsSpent: (c.credits_spent as number) ?? 0,
        progress: c.progress as never,
        outreach: c.outreach as { takeScreenshots?: boolean } | null,
      });
      if (!result.ok) {
        summary.errors.push({
          id: c.id as string,
          message: result.error ?? "native_reconcile_failed",
        });
      } else if (result.done) {
        summary.finalizedSuccess++;
      } else {
        summary.stillRunning++;
      }
      summary.reconciledNative++;
      continue;
    }

    // Legacy `native:` rows were synchronous experiments and have no Apify
    // or Trigger run to poll. Keep the branch for historical records.
    if (String(c.actor_run_id).startsWith("native:")) {
      summary.swept--;
      continue;
    }
    try {
      const snap = await getRunSnapshot(c.actor_run_id as string);

      // Runtime-cap guard: any non-terminal run that has exceeded the
      // wall-clock budget gets force-aborted on Apify + refunded. Same
      // logic as the streaming poll's cap, but this is the safety net
      // for users who closed their tab.
      if (!isTerminal(snap.status) && c.started_at) {
        const ageSecs = Math.floor(
          (Date.now() - new Date(c.started_at as string).getTime()) / 1000,
        );
        if (ageSecs > serverEnv.MAX_RUNTIME_SECS) {
          const apifyToken = serverEnv.APIFY_TOKEN;
          if (apifyToken) {
            try {
              await fetch(
                `https://api.apify.com/v2/actor-runs/${c.actor_run_id}/abort?token=${apifyToken}`,
                { method: "POST" },
              );
            } catch {
              /* best effort */
            }
          }
          await finalizeFailed({
            searchId: c.id as string,
            accountId: c.account_id as string,
            creditsEstimated: (c.credits_estimated as number) ?? 0,
            creditsSpent: (c.credits_spent as number) ?? 0,
            reason: `Auto-stopped after ${serverEnv.MAX_RUNTIME_SECS}s runtime cap`,
          });
          await supabase
            .from("searches")
            .update({ timed_out: true, status: "canceled" })
            .eq("id", c.id);
          summary.finalizedFailed++;
          continue;
        }
      }

      if (!isTerminal(snap.status)) {
        summary.stillRunning++;
        continue;
      }

      if (snap.status === "SUCCEEDED") {
        await finalizeSucceeded({
          searchId: c.id as string,
          accountId: c.account_id as string,
          intent: c.intent as Intent,
          datasetId: snap.defaultDatasetId,
        });
        summary.finalizedSuccess++;
      } else {
        await finalizeFailed({
          searchId: c.id as string,
          accountId: c.account_id as string,
          creditsEstimated: (c.credits_estimated as number) ?? 0,
          creditsSpent: (c.credits_spent as number) ?? 0,
          reason: `Actor ${snap.status}`,
        });
        summary.finalizedFailed++;
      }
    } catch (err) {
      summary.errors.push({
        id: c.id as string,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(summary);
}
