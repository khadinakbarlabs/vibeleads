/**
 * Cancel every non-terminal run in a Trigger.dev batch.
 *
 * Used in two places:
 *   - User-clicked cancel (cancel-action.ts) — stops a campaign mid-run
 *     so the user isn't paying for browsers + Anthropic calls they no
 *     longer want.
 *   - Runtime-cap auto-abort (poll/route.ts) — same idea, machine-driven.
 *
 * Trigger.dev has no batch-cancel API, so we fan out per-run cancels.
 * Concurrent (Promise.allSettled) because cancel is a tiny PUT and
 * sequential adds real wall-clock to a 50-URL batch. Each cancel
 * failure is swallowed — a run that already completed/failed/canceled
 * 404s, which is the correct semantic for "make sure it's not running".
 */
import "server-only";
import { runs } from "@trigger.dev/sdk";

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "INTERRUPTED",
  "EXPIRED",
  "TIMED_OUT",
]);

export interface CancelNativeOutreachResult {
  ok: boolean;
  /** Run ids we asked Trigger.dev to cancel this call. */
  requested: string[];
  /** Run ids already in a terminal status — nothing to do. */
  alreadyTerminal: number;
  /** Run ids where the cancel request itself errored. */
  errored: string[];
  error?: string;
}

export async function cancelNativeOutreachBatch(
  batchId: string,
): Promise<CancelNativeOutreachResult> {
  const toCancel: string[] = [];
  let alreadyTerminal = 0;

  try {
    for await (const run of runs.list({ batch: batchId })) {
      if (TERMINAL_STATUSES.has(run.status)) {
        alreadyTerminal++;
      } else {
        toCancel.push(run.id);
      }
    }
  } catch (e) {
    return {
      ok: false,
      requested: [],
      alreadyTerminal: 0,
      errored: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (toCancel.length === 0) {
    return { ok: true, requested: [], alreadyTerminal, errored: [] };
  }

  const results = await Promise.allSettled(
    toCancel.map((id) => runs.cancel(id)),
  );
  const errored: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") errored.push(toCancel[i]!);
  });

  return { ok: true, requested: toCancel, alreadyTerminal, errored };
}
