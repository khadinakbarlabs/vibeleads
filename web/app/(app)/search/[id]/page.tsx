import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Repeat } from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { Button } from "@/components/ui/button";
import { OutreachResults } from "@/components/outreach/OutreachResults";
import { SearchStatusWatcher } from "./status-watcher";
import { LiveProgressShell } from "./live-progress-shell";

const IN_PROGRESS = [
  "queued",
  "routing",
  "running",
  "normalizing",
  "enriching",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();
  const { data: search } = await supabase
    .from("searches")
    .select("prompt, status")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!search) {
    return {
      title: "Search",
      description: "VibeLeads search results.",
    };
  }

  const prompt =
    search.prompt.length > 52
      ? `${search.prompt.slice(0, 52).trimEnd()}...`
      : search.prompt;

  return {
    title: `Search · ${prompt}`,
    description: `Review ${search.status} VibeLeads search results and saved lead actions.`,
  };
}

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const [searchRes, leadsRes] = await Promise.all([
    supabase
      .from("searches")
      .select("*")
      .eq("id", id)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("leads")
      .select("*")
      .eq("search_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const search = searchRes.data;
  if (!search) notFound();
  const leads = leadsRes.data ?? [];

  const isInProgress = IN_PROGRESS.includes(
    search.status as (typeof IN_PROGRESS)[number],
  );

  // Pre-fill URL for "Run again" / "Retry" — outreach campaigns route back
  // to the campaign wizard with the target re-seeded.
  const outreachInput = (search.actor_input as Record<string, unknown>) ?? {};
  const runAgainUrl = `/outreach/new?${new URLSearchParams({
    ...(typeof outreachInput.businessType === "string"
      ? { businessType: outreachInput.businessType }
      : {}),
    ...(typeof outreachInput.location === "string"
      ? { location: outreachInput.location }
      : {}),
  }).toString()}`;

  const isFailed = search.status === "failed";

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        {/* Action row: 'Retry' replaces 'Run again' when the run failed so
            the verb matches what the user is doing. Same target URL. */}
        {!isInProgress && (
          <Link href={runAgainUrl}>
            <Button variant="secondary" size="sm">
              {isFailed ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </>
              ) : (
                <>
                  <Repeat className="h-3.5 w-3.5" />
                  Run another like this
                </>
              )}
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 mb-10">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
          <span>Outreach campaign</span>
          <span className="opacity-50">·</span>
          <span>{new Date(search.created_at).toLocaleString()}</span>
        </p>
        <h1 className="mt-2 max-w-3xl text-balance text-2xl font-medium tracking-[-0.01em]">
          {search.prompt}
        </h1>
      </div>

      <section className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={search.status} />
            {isInProgress && (
              <span className="text-xs text-[var(--color-fg-subtle)]">
                results stream in below as they arrive
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-[var(--color-fg-subtle)]">
            {search.lead_count} submissions · {search.credits_estimated} credit
            estimate
          </div>
        </div>

        {search.status_reason && (
          <p className="mt-4 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm">
            {search.status_reason}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold tracking-tight">
          Submissions
        </h2>
        <LiveProgressShell
          initialSearch={search}
          resultsSlot={<OutreachResults initialLeads={leads} />}
        />
      </section>

      {isInProgress && <SearchStatusWatcher searchId={search.id} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued:
      "bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)] border-[var(--color-border-strong)]",
    routing:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20",
    running:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20",
    normalizing:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20",
    enriching:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/20",
    completed:
      "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30",
    failed:
      "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30",
    canceled:
      "bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)] border-[var(--color-border-strong)]",
  };
  const cls = styles[status] ?? styles.queued;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-tight ${cls}`}
    >
      {(status === "running" ||
        status === "routing" ||
        status === "normalizing" ||
        status === "enriching") && <Pulse />}
      {status}
    </span>
  );
}

function Pulse() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}
