import "server-only";
import { isJobsEnvelope, workflowName } from "./results";
import { z } from "zod";
import { ACTOR_ID } from "./config";
import { historyStatus, isOwnedRun, type DataRow } from "./data-view";

const objectId = z.string().regex(/^[a-zA-Z0-9]{17}$/);
const runSchema = z.object({
  id: objectId,
  actId: z.string(),
  userId: z.string().optional(),
  status: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullish(),
  buildNumber: z.string().nullish(),
  defaultDatasetId: objectId.nullish(),
});

export type WorkspaceRun = z.infer<typeof runSchema>;
export const RUN_PAGE_SIZE = 20;
export const HISTORY_BATCH_SIZE = 1000;
// Loaded at once so the results table can search, filter and sort the whole list.
export const DATA_PAGE_SIZE = 1000;

export class ApifyRequestError extends Error {
  constructor(public readonly status: number) {
    super("The Apify request did not complete.");
  }
}

export async function request(
  path: string,
  accessToken: string,
  timeoutMs = 12_000,
) {
  const response = await fetch(`https://api.apify.com/v2/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new ApifyRequestError(response.status);
  return response;
}

export async function apifyAccount(accessToken: string) {
  const result = await (await request("users/me", accessToken)).json();
  return z
    .object({
      data: z.object({
        id: z.string().min(1),
        username: z.string().min(1).max(100),
      }),
    })
    .parse(result).data;
}

export async function workspaceRuns(
  accessToken: string,
  accountId: string,
  page: number,
  status: ReturnType<typeof historyStatus>,
) {
  const query = new URLSearchParams({
    desc: "true",
    limit: String(HISTORY_BATCH_SIZE),
    offset: String((page - 1) * HISTORY_BATCH_SIZE),
  });
  if (status) query.set("status", status);
  const result = await (
    await request(`acts/${ACTOR_ID}/runs?${query}`, accessToken).catch(
      (error) => {
        if (
          error instanceof ApifyRequestError &&
          [403, 404].includes(error.status)
        )
          return request(`actor-runs?${query}`, accessToken);
        throw error;
      },
    )
  ).json();
  const { data } = z
    .object({
      data: z.object({
        items: z.array(runSchema),
        total: z.number().nonnegative(),
      }),
    })
    .parse(result);
  return {
    observedAt: Date.now(),
    runs: data.items.filter((run) => isOwnedRun(run, ACTOR_ID, accountId)),
    hasNext: page * HISTORY_BATCH_SIZE < data.total,
  };
}

export async function workspaceRun(
  accessToken: string,
  accountId: string,
  id: string,
) {
  if (!objectId.safeParse(id).success) return null;
  try {
    const result = await (
      await request(`actor-runs/${id}`, accessToken)
    ).json();
    const { data: run } = z.object({ data: runSchema }).parse(result);
    return run.id === id && isOwnedRun(run, ACTOR_ID, accountId) ? run : null;
  } catch (error) {
    if (error instanceof ApifyRequestError && [403, 404].includes(error.status))
      return null;
    throw error;
  }
}

export async function workspaceDataset(
  accessToken: string,
  run: WorkspaceRun,
  page: number,
): Promise<{ rows: DataRow[]; total: number }> {
  if (!run.defaultDatasetId) return { rows: [], total: 0 };
  const offset = (page - 1) * DATA_PAGE_SIZE;
  try {
    const response = await request(
      `datasets/${run.defaultDatasetId}/items?format=json&clean=true&limit=${DATA_PAGE_SIZE}&offset=${offset}`,
      accessToken,
      // Large lists can take Apify 10+ seconds to return.
      30_000,
    );
    const rows = z
      .array(z.record(z.string(), z.unknown()))
      .max(DATA_PAGE_SIZE)
      .parse(await response.json());
    const totalHeader = response.headers.get("x-apify-pagination-total");
    const declared = totalHeader === null ? NaN : Number(totalHeader);
    const total =
      Number.isSafeInteger(declared) && declared >= 0
        ? declared
        : offset + rows.length;
    return { rows, total };
  } catch (error) {
    if (error instanceof ApifyRequestError && error.status === 404)
      return { rows: [], total: 0 };
    throw error;
  }
}

export type ActivityRun = Pick<
  WorkspaceRun,
  "id" | "status" | "startedAt" | "finishedAt"
> & { workflow: string; datasetRows: number | null };
export async function activityRuns(
  accessToken: string,
  runs: WorkspaceRun[],
): Promise<ActivityRun[]> {
  const activities: ActivityRun[] = [];
  for (let offset = 0; offset < runs.length; offset += 5) {
    activities.push(
      ...(await Promise.all(
        runs
          .slice(offset, offset + 5)
          .map(
            async ({ id, status, startedAt, finishedAt, defaultDatasetId }) => {
              let workflow = workflowName(),
                datasetRows: number | null = null;
              if (defaultDatasetId)
                try {
                  const response = await request(
                    `datasets/${defaultDatasetId}/items?format=json&limit=1&fields=tool,name,businessName,score,applyUrl,ok,result,error`,
                    accessToken,
                  );
                  const row = (await response.json())[0];
                  const count = response.headers.get(
                    "x-apify-pagination-total",
                  );
                  if (count !== null && /^\d+$/.test(count))
                    datasetRows = Number(count);
                  if (typeof row?.tool === "string")
                    workflow = workflowName(row.tool);
                  else if (row && (row.applyUrl || isJobsEnvelope(row)))
                    workflow = "Jobs shortlist";
                  else if (
                    row &&
                    (row.name || row.businessName || row.score != null)
                  )
                    workflow = "Lead discovery";
                } catch (error) {
                  if (
                    error instanceof ApifyRequestError &&
                    error.status === 401
                  )
                    throw error;
                }
              return {
                id,
                status,
                startedAt,
                finishedAt,
                workflow,
                datasetRows,
              };
            },
          ),
      )),
    );
  }
  return activities;
}
