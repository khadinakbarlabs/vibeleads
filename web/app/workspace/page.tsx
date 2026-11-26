import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cable } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { ActivityDashboard } from "@/components/workspace/ActivityDashboard";
import { GetStarted } from "@/components/workspace/GetStarted";
import {
  workspaceRuns,
  activityRuns,
  RUN_PAGE_SIZE,
  ApifyRequestError,
  type ActivityRun,
} from "@/lib/workspace/apify";
import { workspaceAccount } from "@/lib/workspace/auth";
import { outcome } from "@/lib/workspace/results";
import { pageNumber, historyStatus } from "@/lib/workspace/data-view";
export const metadata: Metadata = {
  title: "Workspace overview",
  robots: { index: false, follow: false },
};
export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    range?: string;
    group?: string;
    batch?: string;
  }>;
}) {
  const session = await workspaceAccount();
  if (!session) redirect("/connect?status=signin");
  const query = await searchParams;
  const page = pageNumber(query.page),
    status = historyStatus(query.status);
  const batch = pageNumber(query.batch);
  const range = ["7", "30"].includes(query.range ?? "") ? query.range! : "all";
  const group = ["Completed", "In progress", "Needs attention"].includes(
    query.group ?? "",
  )
    ? query.group!
    : "";
  let overview: { startedAt: string; status: string }[] = [];
  let hasOlderBatch = false;
  let runs: ActivityRun[] = [],
    hasNext = false,
    failed = false;
  try {
    const history = await workspaceRuns(
      session.accessToken,
      session.accountId,
      batch,
      status,
    );
    hasOlderBatch = history.hasNext;
    const filtered = history.runs.filter(
      (r) =>
        (!group || outcome(r.status) === group) &&
        (range === "all" ||
          Date.parse(r.startedAt) >=
            history.observedAt - Number(range) * 86400000),
    );
    overview = filtered.map(({ startedAt, status }) => ({ startedAt, status }));
    hasNext = page * RUN_PAGE_SIZE < filtered.length;
    runs = await activityRuns(
      session.accessToken,
      filtered.slice((page - 1) * RUN_PAGE_SIZE, page * RUN_PAGE_SIZE),
    );
  } catch (error) {
    if (error instanceof ApifyRequestError && error.status === 401)
      redirect("/connect?status=expired");
    failed = true;
  }
  const href = (p: number, b = batch) =>
    "/workspace?" +
    new URLSearchParams({
      page: String(p),
      batch: String(b),
      range,
      group,
      ...(status ? { status } : {}),
    });
  return (
    <WorkspaceShell name={session.username}>
      <header className="rd-heading">
        <div>
          <small>Workspace / Overview</small>
          <h1>Workflow overview</h1>
          <p>Explore activity and open a workflow to see its results.</p>
        </div>
        <Link href="/connect" className="vl-button vl-primary">
          <Cable size={17} />
          Connect an AI agent
        </Link>
      </header>
      {failed ? (
        <section className="rd-card">
          <h2>History is temporarily unavailable</h2>
          <Link href={href(page)} className="vl-text-link">
            Reload history
          </Link>
        </section>
      ) : overview.length === 0 &&
        range === "all" &&
        !group &&
        !status &&
        batch === 1 ? (
        <GetStarted username={session.username} />
      ) : (
        <ActivityDashboard
          key={page + String(status)}
          runs={runs}
          overview={overview}
          range={range}
          group={group}
          batch={batch}
          partial={hasOlderBatch || batch > 1}
        />
      )}
      {(hasNext || page > 1 || hasOlderBatch || batch > 1) && (
        <nav className="vl-pagination" aria-label="History pages">
          {page > 1 && (
            <Link href={href(page - 1)} className="vl-button vl-secondary">
              Newer runs
            </Link>
          )}
          <span>Page {page}</span>
          {batch > 1 && (
            <Link className="vl-text-link" href={href(1, batch - 1)}>
              Newer history group
            </Link>
          )}
          {hasOlderBatch && (
            <Link className="vl-text-link" href={href(1, batch + 1)}>
              Older history group
            </Link>
          )}
          {hasNext && (
            <Link href={href(page + 1)} className="vl-button vl-secondary">
              Older runs
            </Link>
          )}
        </nav>
      )}
    </WorkspaceShell>
  );
}
