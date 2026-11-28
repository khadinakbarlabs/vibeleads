import { ACTOR_ID } from "./config";
import { isOwnedRun, type DataRow } from "./data-view";
import { emailEvidence } from "./mailbox-evidence.js";
import { mapResults, record } from "./results";
import {
  listId,
  runContactPolicy,
  type Account,
  type Get,
} from "./saved-lists";

type OwnedRun = {
  actId: string;
  userId?: string;
  defaultKeyValueStoreId?: string | null;
};

function historicalBuyer(row: DataRow, now: number): DataRow {
  const original = record(row.original) ? row.original : null;
  const evidence = record(row.evidence) ? row.evidence : null;
  if (
    row.status !== "actionable" ||
    !original ||
    (!row.signalId && !evidence?.originalUrl)
  )
    return row;
  const deadline = Date.parse(
    String(row.deadline ?? evidence?.deadline ?? original.closesAt ?? ""),
  );
  const recent = (value: unknown) => {
    const at = Date.parse(String(value ?? ""));
    return at <= now && now - at < 86_400_000;
  };
  const expired = deadline <= now;
  const checked =
    recent(original.checkedAt) &&
    (original.route !== "application" ||
      recent(original.routeCheckedAt ?? evidence?.routeCheckedAt));
  const handled = ["replied", "won", "bad_fit", "dismissed"].includes(
    String(row.outcome),
  );
  const status = expired
    ? "closed"
    : handled
      ? "handled"
      : checked
        ? "actionable_at_last_check"
        : "needs_recheck";
  const next = expired
    ? "The recorded deadline has passed."
    : handled
      ? "Check your saved outcome before following up."
      : "Open your current seller project inbox and recheck the buyer’s original before responding.";
  const available = status === "actionable_at_last_check";
  return {
    ...row,
    status,
    statusAtRun: row.status,
    reason: next,
    score: available ? row.score : null,
    original: available
      ? original
      : { ...original, applicationUrl: null, replyAddress: null },
    ...(evidence && {
      evidence: {
        ...evidence,
        status,
        why: next,
        next,
        ...(!available && { responseUrl: null, invitedEmail: null }),
      },
    }),
  };
}

/** Rebuild the seller's view at read time. Apify retains the original dataset as run evidence. */
export async function sellerRunResults(
  get: Get,
  account: Account,
  run: OwnedRun,
  source: DataRow[],
  now = Date.now(),
) {
  if (!isOwnedRun(run, ACTOR_ID, account.accountId))
    throw Error("Run unavailable");
  const rows = mapResults(source);
  if (!rows.length) return [];
  let summary: DataRow = {};
  if (
    run.defaultKeyValueStoreId &&
    rows.some((row) => typeof row.leadId === "string")
  ) {
    try {
      const response = await get(
        "key-value-stores/" +
          run.defaultKeyValueStoreId +
          "/records/RUN_SUMMARY",
        account.accessToken,
      );
      const value: unknown = await response.json();
      if (record(value)) summary = value;
    } catch (error) {
      if (!record(error) || error.status !== 404) throw error;
    }
  }
  // Some older answer envelopes carry the originating list even without a RUN_SUMMARY.
  const envelopeId =
    source.length === 1 && record(source[0].result)
      ? source[0].result.listId
      : undefined;
  const policy = await runContactPolicy(
    get,
    account,
    listId(summary.listId) ? summary.listId : envelopeId,
    summary.stateStore,
  );
  function allowsEvidence(value: unknown): boolean {
    if (Array.isArray(value)) return value.every(allowsEvidence);
    if (!record(value)) return true;
    if (!policy(value)) return false;
    if (
      value.originalUrl &&
      !policy({
        url: value.originalUrl,
        applicationUrl: value.responseUrl,
        author: value.buyer,
        email: value.invitedEmail,
      })
    )
      return false;
    return Object.values(value).every(allowsEvidence);
  }
  return rows.flatMap((row) => {
    if (!allowsEvidence(row)) return [];
    const permitted = policy(row);
    if (!permitted) return [];
    const current = historicalBuyer(permitted, now);
    return typeof current.workEmail === "string" ||
      typeof current.email === "string"
      ? [{ ...current, ...emailEvidence(current) }]
      : [current];
  });
}
