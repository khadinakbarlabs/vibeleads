/**
 * Live progress streaming for in-flight searches.
 *
 * Backend code calls `emitProgress(searchId, patch)` at each pipeline step.
 * The patch is merged with the existing JSON in `searches.progress` and
 * written back. Supabase Realtime fires an UPDATE event on the row, which
 * the client subscribes to in `SearchProgress.tsx` and renders.
 *
 * The shape is deliberately flat so the UI can do small, animated
 * transitions on individual numbers (count-up, ring-fill, etc.) without
 * deep object diffing.
 */
import "server-only";
import { adminSupabase } from "@/lib/db/admin";

export type ProgressPhase =
  | "queued"
  | "routing"
  | "scraping"
  | "normalizing"
  | "enriching"
  | "completing"
  | "completed"
  | "failed";

export interface SearchProgress {
  /** Coarse phase — drives the step-rail highlight in the UI. */
  phase: ProgressPhase;
  /** Single human-readable line shown under the step rail. */
  step: string;
  /** Pre-flight estimate; the UI animates `normalized` toward this number. */
  expected_leads: number;
  /** Live counters — each writes back individually so Realtime updates feel granular. */
  scraped: number;
  normalized: number;
  enriched_phones: number;
  enriched_emails: number;
  enriched_socials: number;
  /** ISO timestamps. */
  started_at: string;
  updated_at: string;
  /** Best-effort estimate of seconds remaining; client uses for ETA pill. */
  eta_secs: number | null;
  /** Optional rotating "in-flight" copy lines surfaced below the rail. */
  log: string[];
  /** Cached Apify dataset id for live polling; avoids a lookup-only poll path. */
  apify_dataset_id?: string | null;
  /** Number of Apify dataset rows already ingested by the live poller. */
  apify_dataset_offset?: number;
  /** Last seen actor run status from Apify, shown for operator/debug visibility. */
  apify_run_status?: string | null;
  /** Last seen Apify status message, useful when rows have not arrived yet. */
  apify_status_message?: string | null;
  /** Trigger.dev batch id for the native outreach path (parallel to
   *  apify_dataset_id). Stored once at fan-out, read on every poll tick. */
  trigger_batch_id?: string | null;
  /** Total runs fanned out in the batch — persisted once at fan-out so the
   *  poll tick knows the denominator without re-enumerating every run. */
  trigger_total?: number;
  /** Trigger.dev run ids already ingested into `leads` by prior poll
   *  ticks. The cursor — present runs minus this set = work to do. */
  trigger_runs_ingested?: string[];
}

/** Initial progress when a search row is created. */
export function initialProgress(expectedLeads: number): SearchProgress {
  const now = new Date().toISOString();
  return {
    phase: "queued",
    step: "Preparing your search…",
    expected_leads: expectedLeads,
    scraped: 0,
    normalized: 0,
    enriched_phones: 0,
    enriched_emails: 0,
    enriched_socials: 0,
    started_at: now,
    updated_at: now,
    eta_secs: null,
    log: [],
  };
}

/**
 * Merge `patch` into the existing progress jsonb and write back. Updates
 * `updated_at` automatically. Appends to `log` if patch.log is provided.
 */
export async function emitProgress(
  searchId: string,
  patch: Partial<Omit<SearchProgress, "started_at" | "updated_at" | "log">> & {
    log?: string;
  },
): Promise<void> {
  const supabase = adminSupabase();
  const { data: row } = await supabase
    .from("searches")
    .select("progress")
    .eq("id", searchId)
    .maybeSingle();

  const prev = (row?.progress as SearchProgress | null) ?? initialProgress(0);
  const { log, ...rest } = patch;

  const next: SearchProgress = {
    ...prev,
    ...rest,
    updated_at: new Date().toISOString(),
    // Cap the log at the most recent 8 entries — keeps the UI tidy and
    // bounds the size of jsonb writes through the Realtime channel.
    log: log ? [...(prev.log ?? []).slice(-7), log] : (prev.log ?? []),
  };

  await supabase
    .from("searches")
    .update({ progress: next as never })
    .eq("id", searchId);
}

/**
 * Convenience: increment a counter. Reads-then-writes via emitProgress —
 * called sparingly (e.g. once per N enrichments) to avoid hammering the
 * row with updates.
 */
export async function incrementProgress(
  searchId: string,
  field:
    | "scraped"
    | "normalized"
    | "enriched_phones"
    | "enriched_emails"
    | "enriched_socials",
  delta: number,
): Promise<void> {
  const supabase = adminSupabase();
  const { data: row } = await supabase
    .from("searches")
    .select("progress")
    .eq("id", searchId)
    .maybeSingle();

  const prev = (row?.progress as SearchProgress | null) ?? initialProgress(0);
  await emitProgress(searchId, { [field]: (prev[field] ?? 0) + delta });
}
