import Link from "next/link";
import { request } from "@/lib/workspace/apify";
import type { WorkspaceAccount } from "@/lib/workspace/auth";
import {
  collections,
  isCollection,
  savedPage,
  type Collection,
} from "@/lib/workspace/saved-lists";
export async function SavedLists({
  account,
  bucket,
  after,
}: {
  account: WorkspaceAccount;
  bucket?: string;
  after?: string;
}) {
  const chosen = isCollection(bucket)
    ? [bucket]
    : (Object.keys(collections) as Collection[]);
  const pages = await Promise.all(
    chosen.map(async (family) => {
      try {
        return {
          family,
          ...(await savedPage(request, account, family, after)),
          failed: false,
        };
      } catch {
        return { family, items: [], next: null, failed: true };
      }
    }),
  );
  const any = pages.some((p) => p.items.length);
  return (
    <section
      className="rd-card saved-collections"
      aria-labelledby="saved-heading"
      id="saved"
    >
      <header>
        <h2 id="saved-heading">Saved prospect lists</h2>
      </header>
      <p>Open a list to see its prospects, contact coverage and CSV export.</p>
      {pages.map(
        (p) =>
          (p.items.length > 0 || p.failed || chosen.length === 1) && (
            <div key={p.family}>
              <h3>{collections[p.family].label}</h3>
              {p.failed ? (
                <p role="status">
                  This collection could not be read. Refresh or sign in again to
                  retry.
                </p>
              ) : (
                <ul>
                  {p.items.map((i) => (
                    <li key={i.id}>
                      <Link href={`/workspace/lists/${i.family}/${i.id}`}>
                        {i.name}
                      </Link>
                      {i.date && (
                        <time dateTime={i.date}>{i.date.slice(0, 10)}</time>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {p.next && (
                <Link
                  href={`/workspace?bucket=${p.family}&after=${p.next}#saved`}
                >
                  More lists →
                </Link>
              )}
            </div>
          ),
      )}
      {!any && pages.every((p) => !p.failed) && (
        <p>
          {after
            ? "This page contains no saved lists."
            : "No saved prospect lists in this account yet. Ask your assistant for a search plan, then approve it when ready."}
        </p>
      )}
      {bucket && <Link href="/workspace#saved">Back to all collections</Link>}
      <small>
        Lists follow Apify storage retention. Export a CSV to keep a copy.
        Searches saved only to a run appear in search history below.
      </small>
    </section>
  );
}
