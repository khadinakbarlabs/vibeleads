import { ResultExplorer } from "@/components/workspace/ResultExplorer";
import { LeadTable } from "@/components/workspace/LeadTable";
import { outcome, duration } from "@/lib/workspace/results";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import {
  ApifyRequestError,
  DATA_PAGE_SIZE,
  workspaceSellerDataset,
  workspaceRun,
} from "@/lib/workspace/apify";
import { workspaceAccount } from "@/lib/workspace/auth";
import { pageNumber, runDate, type DataRow } from "@/lib/workspace/data-view";

export const metadata: Metadata = {
  title: "VibeLeads dataset",
  robots: { index: false, follow: false },
};

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await workspaceAccount();
  if (!session) redirect("/connect?status=signin");
  const { id } = await params;
  const page = pageNumber((await searchParams).page);
  const run = await workspaceRun(
    session.accessToken,
    session.accountId,
    id,
  ).catch((error) => {
    if (error instanceof ApifyRequestError && error.status === 401)
      redirect("/connect?status=expired");
    throw error;
  });
  if (!run) notFound();
  let mapped: DataRow[] = [];
  let total = 0;
  let title = "Workflow results";
  let failed = false;
  try {
    ({
      rows: mapped,
      total,
      title,
    } = await workspaceSellerDataset(session, run, page));
  } catch (error) {
    if (error instanceof ApifyRequestError && error.status === 401)
      redirect("/connect?status=expired");
    failed = true;
  }
  const href = "/workspace/runs/" + run.id;
  return (
    <WorkspaceShell name={session.username}>
      <Link className="vl-back-link" href="/workspace">
        ← Workflow overview
      </Link>
      <header className="rd-heading">
        <div>
          <small>Workflow / #{run.id.slice(-7)}</small>
          <h1>{title}</h1>
          <p>
            {outcome(run.status)} · {runDate(run.startedAt)} UTC · Duration{" "}
            {duration(run.startedAt, run.finishedAt)}
          </p>
          <a
            className="vl-text-link"
            href={"https://console.apify.com/actors/runs/" + run.id}
            rel="noreferrer"
            target="_blank"
          >
            Historical run record in Apify
          </a>
        </div>
      </header>
      {failed ? (
        <section className="rd-card">
          <h2>Results are temporarily unavailable</h2>
          <Link className="vl-text-link" href={href + "?page=" + page}>
            Reload results
          </Link>
        </section>
      ) : (
        <>
          <div className="rd-resultsbar">
            <span>
              {total > DATA_PAGE_SIZE
                ? `Part ${page} of ${Math.ceil(total / DATA_PAGE_SIZE)} · ${total.toLocaleString()} original rows`
                : "Results from this run"}{" "}
              · Current opt-outs applied
            </span>
            {mapped.length > 0 && (
              <div className="vl-actions">
                {["csv", "json"].map((format) => (
                  <a
                    key={format}
                    className="vl-button vl-secondary"
                    href={
                      href +
                      "/export?view=results&format=" +
                      format +
                      "&page=" +
                      page
                    }
                  >
                    <Download size={15} />
                    Download {format.toUpperCase()}
                  </a>
                ))}
              </div>
            )}
          </div>
          {mapped.length > 0 && mapped.every((r) => !r.workflow) ? (
            <LeadTable
              rows={mapped}
              currentRowsUrl={
                href + "/export?view=results&format=json&page=" + page
              }
              key={page}
              filename={
                "vibeleads-" + run.id + (page > 1 ? "-part-" + page : "")
              }
            />
          ) : (
            <ResultExplorer rows={mapped} key={page} />
          )}
          {(page > 1 || page * DATA_PAGE_SIZE < total) && (
            <nav className="vl-pagination" aria-label="Results pages">
              {page > 1 && (
                <Link href={href + "?page=" + (page - 1)}>Previous</Link>
              )}
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / DATA_PAGE_SIZE))}
              </span>
              {page * DATA_PAGE_SIZE < total && (
                <Link href={href + "?page=" + (page + 1)}>Next</Link>
              )}
            </nav>
          )}
        </>
      )}
    </WorkspaceShell>
  );
}
