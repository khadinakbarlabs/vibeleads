import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { workspaceAccount } from "@/lib/workspace/auth";
import { request, ApifyRequestError } from "@/lib/workspace/apify";
import { isCollection, listId, savedList } from "@/lib/workspace/saved-lists";
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
    counts = rows ? contactSummary(rows) : null;
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
          <a className="vl-text-link" href={data.storageUrl}>
            Open the original in Apify ↗
          </a>
        </p>
      ) : !counts?.total ? (
        <section className="rd-card">
          <h2>No saved prospects</h2>
          <p>This list contains no identifiable prospect records.</p>
        </section>
      ) : (
        <>
          <section className="rd-card contact-coverage">
            <h2>Contact coverage</h2>
            <p>
              {counts.total.toLocaleString()} prospect records. An address on
              file does not establish deliverability.
            </p>
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
          </section>
          <LeadTable filename={"vibeleads-" + id} rows={rows} />
        </>
      )}
    </WorkspaceShell>
  );
}
