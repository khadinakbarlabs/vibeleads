/**
 * Native outreach mid-run sync — pulls completed Trigger.dev runs for one
 * campaign and upserts each SubmissionReceipt into `leads` via the same
 * normalizer the Apify path uses (one CRM row shape, two sources).
 *
 * Why this exists: Vercel functions can't park on a 5-min Trigger.dev
 * batch (function timeout, no long polling). The live-poll route and cron
 * sweep both call this module. Every Trigger terminal state is ingested:
 * completed runs contribute their receipt and failed/canceled runs become an
 * explicit failed receipt when their original payload is available. A single
 * crashed task must never strand an entire campaign in "running".
 *
 * The cursor is `progress.trigger_runs_ingested` — a Set of Trigger run
 * IDs we've already processed. Set is persisted as an array. Idempotent:
 * re-polling skips known IDs and upserts are keyed on (account_id,
 * dedupe_key) so even a duplicate insert is a no-op.
 */
import "server-only";
import { runs } from "@trigger.dev/sdk";
import { adminSupabase } from "@/lib/db/admin";
import { normalizeContactFormSubmit } from "@/lib/normalize/contact-form-submit";
import type { NormalizedLead } from "@/lib/normalize/types";

/** Mirror of the submitter's SubmissionReceipt. Imported as a type-only
 *  reference at module load — does NOT pull Playwright into the bundle. */
import type {
  SubmissionInput,
  SubmissionReceipt,
} from "../../submitter/src/types";

export const TERMINAL_TRIGGER_RUN_STATUSES = [
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
] as const;

export interface SyncNativeOutreachInput {
  searchId: string;
  accountId: string;
  batchId: string;
  /** Total runs in the batch (persisted at fan-out) — the denominator, so
   *  we don't re-enumerate every run each tick just to count. */
  totalRuns: number;
  /** Run ids we've already ingested in prior poll ticks. */
  ingestedIds: string[];
}

export interface SyncNativeOutreachResult {
  ok: boolean;
  /** Newly upserted lead rows this tick. */
  newCount: number;
  /** Cumulative count of terminal runs we know about. Kept as `completedRuns`
   * for the existing API response, but includes failed/canceled tasks too. */
  totalCount: number;
  /** Run IDs ingested by THIS tick, to be appended to the cursor. */
  newlyIngestedIds: string[];
  /** Count of runs with a verified `success` (or chatbot_sent) status. */
  successCount: number;
  /** Count of runs whose form was found at all (verified or not). */
  formFoundCount: number;
  /** Updated counts of completed/total runs in the batch, for the UI. */
  completedRuns: number;
  totalRuns: number;
  error?: string;
}

type TerminalRun = {
  id: string;
  status: (typeof TERMINAL_TRIGGER_RUN_STATUSES)[number];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function isReceipt(value: unknown): value is SubmissionReceipt {
  const row = asRecord(value);
  return (
    typeof row?.url === "string" &&
    typeof row.submission_status === "string" &&
    typeof row.form_found === "boolean"
  );
}

function terminalFailureReceipt(input: {
  payload: unknown;
  status: TerminalRun["status"];
  error: unknown;
}): SubmissionReceipt | null {
  const payload = asRecord(input.payload) as Partial<SubmissionInput> | null;
  if (!payload || typeof payload.url !== "string") return null;

  const error = asRecord(input.error);
  const errorMessage =
    typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : `Trigger.dev task ended with ${input.status}`;

  return {
    url: payload.url,
    business_name:
      typeof payload.businessName === "string" ? payload.businessName : null,
    submission_status: "failed",
    form_found: false,
    form_submitted: false,
    fields_filled: [],
    ai_generated_fields: [],
    mailto: null,
    attempts: [],
    error_message: errorMessage,
    screenshot_url: null,
    scraped_at: new Date().toISOString(),
  };
}

/**
 * Map the submitter's SubmissionStatus → the normalizer's wider enum
 * (the Apify actor's vocabulary). The normalizer accepts either; this
 * keeps `submitted_unverified` → `unverified`, `mailto_fallback` →
 * `mailto_extracted`, etc. so the CRM row reads identically.
 */
type NormalizerStatus = NonNullable<
  Parameters<typeof normalizeContactFormSubmit>[0]["submission_status"]
>;

function mapStatus(
  s: SubmissionReceipt["submission_status"],
): NormalizerStatus {
  switch (s) {
    case "success":
      return "success";
    case "submitted_unverified":
      return "unverified";
    case "mailto_fallback":
      return "mailto_extracted";
    case "no_channel":
      return "no_channel";
    case "captcha_blocked":
      return "captcha_blocked";
    case "failed":
    default:
      return "failed";
  }
}

/** Translate a SubmissionReceipt → the RawSubmissionRow the normalizer
 *  consumes. Just a field rename, no projection loss. */
function receiptToRawRow(
  r: SubmissionReceipt,
): Parameters<typeof normalizeContactFormSubmit>[0] {
  return {
    business_name: r.business_name ?? undefined,
    contact_page_url: r.url,
    form_found: r.form_found,
    form_submitted: r.form_submitted,
    fields_filled: r.fields_filled,
    ai_generated_fields: r.ai_generated_fields,
    submission_status: mapStatus(r.submission_status),
    error_message: r.error_message,
    screenshot_url: r.screenshot_url,
    scraped_at: r.scraped_at,
  };
}

export async function syncNativeOutreachToLeads(
  input: SyncNativeOutreachInput,
): Promise<SyncNativeOutreachResult> {
  const supabase = adminSupabase();
  const tag = `search:${input.searchId}`;
  const ingested = new Set(input.ingestedIds);
  const totalRuns = input.totalRuns;

  // 1. Query all terminal runs in a single bounded request. `totalRuns` is
  // persisted at fan-out, so we don't enumerate every active run just to
  // calculate a denominator.
  let completedRuns = 0;
  const newTerminalRuns: TerminalRun[] = [];

  try {
    for await (const run of runs.list({
      tag,
      batch: input.batchId,
      status: [...TERMINAL_TRIGGER_RUN_STATUSES],
      limit: 100,
    })) {
      completedRuns += 1;
      if (!ingested.has(run.id)) {
        newTerminalRuns.push({
          id: run.id,
          status: run.status as TerminalRun["status"],
        });
      }
    }
  } catch (e) {
    return {
      ok: false,
      newCount: 0,
      totalCount: 0,
      newlyIngestedIds: [],
      successCount: 0,
      formFoundCount: 0,
      completedRuns: 0,
      totalRuns,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (newTerminalRuns.length === 0) {
    return {
      ok: true,
      newCount: 0,
      totalCount: 0,
      newlyIngestedIds: [],
      successCount: 0,
      formFoundCount: 0,
      completedRuns,
      totalRuns,
    };
  }

  // 2. Fetch every new terminal run in bounded parallel. Completed tasks
  // carry a SubmissionReceipt; failed tasks are projected from their payload
  // into an explicit failed receipt so the campaign can reach a final state.
  const upsertRows: Array<
    NormalizedLead & { account_id: string; search_id: string }
  > = [];
  let successCount = 0;
  let formFoundCount = 0;
  const ingestedThisTick: string[] = [];

  const RETRIEVE_CONCURRENCY = 5;
  for (let i = 0; i < newTerminalRuns.length; i += RETRIEVE_CONCURRENCY) {
    const chunk = newTerminalRuns.slice(i, i + RETRIEVE_CONCURRENCY);
    const fetched = await Promise.all(
      chunk.map(async ({ id, status }) => {
        try {
          const run = await runs.retrieve(id);
          return {
            id,
            status,
            output: run.output as unknown,
            payload: run.payload as unknown,
            error: "error" in run ? run.error : undefined,
          };
        } catch {
          // Leave failed ids OUT of ingested so the next poll retries them.
          return { id, output: undefined, failed: true as const };
        }
      }),
    );
    for (const r of fetched) {
      if ("failed" in r) continue;
      const receipt = isReceipt(r.output)
        ? r.output
        : terminalFailureReceipt({
            payload: r.payload,
            status: r.status,
            error: r.error,
          });
      if (!receipt) {
        // A malformed run with no recoverable URL cannot become a CRM row.
        // Mark it consumed so it does not burn an API call forever; the
        // terminal counter still lets the parent campaign complete.
        ingestedThisTick.push(r.id);
        continue;
      }
      if (receipt.form_found) formFoundCount += 1;
      if (receipt.submission_status === "success") successCount += 1;
      const normalized = normalizeContactFormSubmit(receiptToRawRow(receipt));
      if (normalized) {
        upsertRows.push({
          ...normalized,
          account_id: input.accountId,
          search_id: input.searchId,
        });
      }
      ingestedThisTick.push(r.id);
    }
  }

  if (upsertRows.length === 0) {
    return {
      ok: true,
      newCount: 0,
      totalCount: 0,
      newlyIngestedIds: ingestedThisTick,
      successCount,
      formFoundCount,
      completedRuns,
      totalRuns,
    };
  }

  // 3. Upsert via the same conflict shape as the Apify + native-maps paths
  // so a re-poll never doubles up.
  const inserts = upsertRows.map((r) => ({
    account_id: r.account_id,
    search_id: r.search_id,
    business_name: r.business_name,
    contact_name: r.contact_name,
    category: r.category,
    categories: r.categories,
    address: r.address,
    city: r.city,
    region: r.region,
    country: r.country,
    postal_code: r.postal_code,
    lat: r.lat,
    lng: r.lng,
    website: r.website,
    google_maps_url: r.google_maps_url,
    place_id: r.place_id,
    lead_score: r.lead_score,
    source_url: r.source_url,
    emails: r.emails,
    phones: r.phones,
    socials: r.socials as never,
    rating: r.rating,
    review_count: r.review_count,
    hours: r.hours as never,
    description: r.description,
    raw: r.raw as never,
    // Scope the dedupe key to THIS campaign. The normalizer keys outreach
    // receipts on `submit:<domain>`; with the account-wide unique
    // (account_id, dedupe_key) that made a second campaign targeting the
    // same domain OVERWRITE the first campaign's row (and miscount
    // lead_count). Prefixing the search id isolates per campaign while
    // still de-duping repeat domains within one campaign.
    dedupe_key: `${r.search_id}:${r.dedupe_key}`,
    enrichment_state: "done" as const,
  }));

  const { error, count } = await supabase.from("leads").upsert(inserts, {
    onConflict: "account_id,dedupe_key",
    ignoreDuplicates: false,
    count: "exact",
  });

  if (error) {
    return {
      ok: false,
      newCount: 0,
      totalCount: 0,
      newlyIngestedIds: ingestedThisTick,
      successCount,
      formFoundCount,
      completedRuns,
      totalRuns,
      error: error.message,
    };
  }

  return {
    ok: true,
    newCount: count ?? upsertRows.length,
    totalCount: count ?? upsertRows.length,
    newlyIngestedIds: ingestedThisTick,
    successCount,
    formFoundCount,
    completedRuns,
    totalRuns,
  };
}
