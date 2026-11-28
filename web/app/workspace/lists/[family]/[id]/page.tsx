import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { workspaceAccount } from "@/lib/workspace/auth";
import { request, ApifyRequestError } from "@/lib/workspace/apify";
import {
  isCollection,
  listId,
  savedList,
  salesSummary,
} from "@/lib/workspace/saved-lists";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { LeadTable } from "@/components/workspace/LeadTable";
import { contactSummary } from "@/lib/workspace/table";
export const metadata: Metadata = {
  title: "Saved prospect list",
  robots: { index: false, follow: false },
};
export default async function Saved({
  params,
}: {
  params: Promise<{ family: string; id: string }>;
}) {
  const a = await workspaceAccount();
  if (!a) redirect("/connect?status=signin");
  const { family, id } = await params;
  if (!isCollection(family) || !listId(id)) notFound();
  let data;
  try {
    data = await savedList(request, a, family, id);
  } catch (e) {
    if (e instanceof ApifyRequestError && e.status === 401)
      redirect("/connect?status=expired");
    return (
      <WorkspaceShell name={a.username}>
        <h1>Saved list unavailable</h1>
        <p>
          We could not load this list. Your previously saved results may still
          be available.
        </p>
        <Link href="/workspace#saved">Return to saved lists</Link>
      </WorkspaceShell>
    );
  }
  if (!data) notFound();
  const rows = data.rows,
    counts = rows
      ? contactSummary(rows.filter((row) => row.kind !== "post"))
      : null;
  const sales = rows ? salesSummary(rows) : null;
  const posts = rows?.filter((row) => row.kind === "post").length ?? 0;
  return (
    <WorkspaceShell name={a.username}>
      <Link className="vl-back-link" href="/workspace#saved">
        ← Saved prospect lists
      </Link>
      <header className="rd-heading">
        <div>
          <h1>{data.name}</h1>
          {data.date && <p>Saved {data.date.slice(0, 10)} UTC</p>}
        </div>
      </header>
      {rows === null ? (
        <p>
          This list exceeds the dashboard preview size.{" "}
          <a
            className="vl-button vl-primary"
            href={`/workspace/lists/${family}/${id}/download`}
          >
            Download full list (JSON)
          </a>
        </p>
      ) : !rows.length || !counts ? (
        <section className="rd-card">
          <h2>No saved results</h2>
          <p>This list contains no identifiable prospects or signal posts.</p>
        </section>
      ) : (
        <>
          <section className="rd-card contact-coverage">
            <h2>{counts.total ? "Contact coverage" : "Signal posts"}</h2>
            <p>
              {counts.total.toLocaleString()} prospect records · {posts} signal
              posts.{" "}
              {counts.total > 0 &&
                "An address on file does not establish deliverability."}
            </p>
            {counts.total > 0 && (
              <ul>
                {(
                  [
                    ["Email on file", counts.email],
                    ["Phone on file", counts.phone],
                    ["Website on file", counts.website],
                  ] as const
                ).map(([label, n]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <meter
                      aria-label={label}
                      min={0}
                      max={counts.total}
                      value={n}
                    />
                    <strong>
                      {n} of {counts.total}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {sales && sales.emailOnFile > 0 && (
            <p className="rd-card contact-coverage">
              {sales.withRecordedCheck
                ? `${sales.passedEmailCheck} of ${sales.emailOnFile} addresses on file were reported verified by the saved email check.`
                : "Email-check status is unknown for these addresses."}
            </p>
          )}
          {sales && sales.ranked > 0 && (
            <section className="rd-card contact-coverage">
              <h2>Who to contact first</h2>
              <p>
                {sales.ranked} of {sales.prospects} prospect records have a
                saved priority or score in this breakdown. Review the reason
                beside each prospect before reaching out.
              </p>
              <ul>
                {sales.groups.map(([label, count]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <meter
                      min={0}
                      max={sales.ranked}
                      value={count}
                      aria-label={label}
                    />
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <LeadTable
            filename={"vibeleads-" + id}
            rows={rows}
            currentRowsUrl={`/workspace/lists/${family}/${id}/download?view=results`}
          />
        </>
      )}
    </WorkspaceShell>
  );
}
