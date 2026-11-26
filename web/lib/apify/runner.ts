import "server-only";
import { apify } from "./client";

export type RunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "ABORTING"
  | "ABORTED"
  | "TIMING-OUT"
  | "TIMED-OUT";

export interface RunSnapshot {
  runId: string;
  status: RunStatus;
  defaultDatasetId: string;
  startedAt: string | null;
  finishedAt: string | null;
  itemCount: number | null;
}

const TERMINAL_STATUSES: ReadonlyArray<RunStatus> = [
  "SUCCEEDED",
  "FAILED",
  "ABORTED",
  "TIMED-OUT",
];

export function isTerminal(status: RunStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Poll the current status of a run. */
export async function getRunSnapshot(runId: string): Promise<RunSnapshot> {
  const run = await apify().run(runId).get();
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }
  return {
    runId: run.id,
    status: run.status as RunStatus,
    defaultDatasetId: run.defaultDatasetId,
    startedAt: run.startedAt ? new Date(run.startedAt).toISOString() : null,
    finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
    // total item count is on the dataset, not the run; left null here.
    itemCount: null,
  };
}

/**
 * Fetch dataset rows for a completed run. Pages internally; default cap is
 * 1000 rows so a single search doesn't run away.
 */
export async function getRunDataset<T = unknown>(
  datasetId: string,
  limit = 1000,
): Promise<T[]> {
  const { items } = await apify().dataset(datasetId).listItems({
    limit,
    clean: true,
  });
  return items as T[];
}

export interface DatasetPage<T = unknown> {
  items: T[];
  offset: number;
  limit: number;
  count: number;
  total: number;
  nextOffset: number;
}

/**
 * Fetch one Apify dataset page. Live polling uses this with an offset cursor
 * so every tick processes only rows appended since the previous tick.
 */
export async function getRunDatasetPage<T = unknown>(
  datasetId: string,
  opts: { offset?: number; limit?: number } = {},
): Promise<DatasetPage<T>> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.max(1, Math.min(opts.limit ?? 250, 1000));
  const page = await apify().dataset(datasetId).listItems({
    offset,
    limit,
    clean: true,
  });
  const raw = page as typeof page & {
    total?: number;
    count?: number;
    offset?: number;
    limit?: number;
  };
  const items = page.items as T[];
  const count = raw.count ?? items.length;
  return {
    items,
    offset: raw.offset ?? offset,
    limit: raw.limit ?? limit,
    count,
    total: raw.total ?? offset + items.length,
    nextOffset: offset + items.length,
  };
}

/**
 * Abort a running actor (e.g., user cancellation or refund flow).
 * Idempotent: aborting an already-terminal run resolves cleanly.
 */
export async function abortRun(runId: string): Promise<void> {
  try {
    await apify().run(runId).abort();
  } catch (err) {
    // Apify SDK throws if run is already terminal — treat that as success.
    if (
      err instanceof Error &&
      /already finished|not running/i.test(err.message)
    )
      return;
    throw err;
  }
}
