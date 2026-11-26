"use server";

/**
 * Bulk cancel every search this account has in a non-terminal status.
 * Used by the "Cancel all running" panic-button on the dashboard so a
 * user who realises they kicked off five expensive runs by mistake
 * can stop bleeding credits in one click.
 *
 * Implementation: pulls all `routing|running|normalizing|enriching`
 * searches owned by the caller, delegates to `cancelSearch` per row.
 * Sequential rather than `Promise.all` so a transient Apify abort
 * failure on row #3 doesn't prevent rows #4+ from cancelling — each
 * row gets its own try-catch via `cancelSearch`.
 */
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { cancelSearch } from "./[id]/cancel-action";

const NON_TERMINAL = [
  "routing",
  "running",
  "normalizing",
  "enriching",
] as const;

export interface CancelAllResult {
  ok: boolean;
  /** How many searches we found in a non-terminal status. */
  found: number;
  /** How many we successfully cancelled (status flipped to canceled). */
  cancelled: number;
  /** Total credits refunded across all cancellations. */
  refunded: number;
  error?: string;
}

export async function cancelAllRunningSearches(): Promise<CancelAllResult> {
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { data: rows, error } = await supabase
    .from("searches")
    .select("id")
    .eq("account_id", accountId)
    .in("status", NON_TERMINAL);

  if (error) {
    return {
      ok: false,
      found: 0,
      cancelled: 0,
      refunded: 0,
      error: error.message,
    };
  }
  if (!rows || rows.length === 0) {
    return { ok: true, found: 0, cancelled: 0, refunded: 0 };
  }

  let cancelled = 0;
  let refunded = 0;
  for (const row of rows) {
    const res = await cancelSearch(row.id as string);
    if (res.ok && res.status === "canceled") {
      cancelled++;
      refunded += res.refunded ?? 0;
    }
  }

  return { ok: true, found: rows.length, cancelled, refunded };
}
