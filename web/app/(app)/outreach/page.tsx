import Link from "next/link";
import {
  Send,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldX,
  Camera,
} from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Outreach hub — campaign history for the contact-form-submit pipeline.
 *
 * Different from /lists (saved leads) and /exports (delivery attempts to
 * external CRMs) because outreach actually *sends messages on the user's
 * behalf*. That's a distinct action class — sender identity, message body,
 * submission outcome per target — and it deserves its own surface in the
 * sidebar instead of being buried inside the AI-routed /search/new flow.
 *
 * Server component. Queries `searches` filtered to
 * `intent = 'contact_form_submit'`. Per-target submission stats come from
 * `leads.raw.submission_status`, aggregated client-side after the fetch
 * (the JSON-column lookup makes a SQL aggregation too noisy here — and
 * we're typically dealing with 10s–100s of leads per campaign).
 *
 * Empty state walks first-time users to the demo (visual showcase) or
 * straight into the composer with the outreach template pre-selected.
 */

interface SearchRow {
  id: string;
  prompt: string;
  status: string;
  lead_count: number | null;
  credits_spent: number | null;
  created_at: string;
}

interface SubmissionRollup {
  total: number;
  success: number;
  failed: number;
  captcha: number;
  noForm: number;
  error: number;
}

export default async function OutreachPage() {
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { data: rawSearches } = await supabase
    .from("searches")
    .select("id, prompt, status, lead_count, credits_spent, created_at")
    .eq("account_id", accountId)
    .eq("intent", "contact_form_submit")
    .order("created_at", { ascending: false })
    .limit(50);

  const searches = (rawSearches ?? []) as SearchRow[];

  // Per-search submission rollup. One follow-up read scoped to the
  // returned search ids; raw is JSON so we filter the keys we need
  // client-side rather than building a complex SQL projection.
  const rollups = new Map<string, SubmissionRollup>();
  if (searches.length > 0) {
    const ids = searches.map((s) => s.id);
    const { data: leadRows } = await supabase
      .from("leads")
      .select("search_id, raw")
      .in("search_id", ids);

    for (const row of leadRows ?? []) {
      const id = row.search_id as string;
      const status = (row.raw as Record<string, unknown> | null)?.[
        "submission_status"
      ] as string | undefined;
      const r = rollups.get(id) ?? {
        total: 0,
        success: 0,
        failed: 0,
        captcha: 0,
        noForm: 0,
        error: 0,
      };
      r.total += 1;
      if (status === "success") r.success += 1;
      else if (status === "failed") r.failed += 1;
      else if (status === "captcha_blocked") r.captcha += 1;
      else if (status === "no_form") r.noForm += 1;
      else r.error += 1;
      rollups.set(id, r);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Outreach
          </p>
          <h1 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
            Contact-form campaigns
          </h1>
          <p className="mt-3 max-w-2xl text-balance text-[var(--color-fg-muted)]">
            VibeLeads finds qualifying businesses, locates their contact form,
            fills the standard fields with your sender identity and message, and
            reports back on each submission. Different from a regular search —
            every run actually delivers messages on your behalf.
          </p>
        </div>
        <Link href="/outreach/new">
          <Button>
            <Send className="h-3.5 w-3.5" />
            New campaign
          </Button>
        </Link>
      </div>

      {searches.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {searches.map((s) => {
            const r = rollups.get(s.id);
            return (
              <li key={s.id}>
                <Link
                  href={`/search/${s.id}`}
                  className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)] sm:flex-row sm:items-start sm:gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CampaignStatusChip status={s.status} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
                        {new Date(s.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--color-fg)]">
                      {s.prompt || (
                        <span className="text-[var(--color-fg-subtle)] italic">
                          (no prompt recorded)
                        </span>
                      )}
                    </p>
                    {r ? (
                      <SubmissionBreakdown rollup={r} />
                    ) : (
                      <p className="mt-3 text-[12px] text-[var(--color-fg-subtle)]">
                        {(s.lead_count ?? 0).toLocaleString()} targets · no
                        submissions yet
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-[12px] text-[var(--color-fg-muted)] sm:flex-col sm:items-end sm:text-right">
                    <span className="font-mono tabular-nums">
                      {(s.credits_spent ?? 0).toLocaleString()} credits
                    </span>
                    <ArrowUpRight className="hidden h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Summary chips for the per-target submission outcome. Mirrors the
 * status taxonomy from `lib/normalize/contact-form-submit.ts`. Hidden
 * categories (count = 0) are skipped to keep the row scannable.
 */
function SubmissionBreakdown({ rollup }: { rollup: SubmissionRollup }) {
  const items: Array<{
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    count: number;
    tone: "success" | "danger" | "warning" | "muted";
  }> = [
    {
      Icon: CheckCircle2,
      label: "delivered",
      count: rollup.success,
      tone: "success",
    },
    { Icon: XCircle, label: "failed", count: rollup.failed, tone: "danger" },
    {
      Icon: ShieldX,
      label: "captcha",
      count: rollup.captcha,
      tone: "warning",
    },
    {
      Icon: ShieldCheck,
      label: "no form",
      count: rollup.noForm,
      tone: "muted",
    },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
      <span className="font-mono tabular-nums text-[var(--color-fg-muted)]">
        {rollup.total.toLocaleString()} target
        {rollup.total === 1 ? "" : "s"} ·
      </span>
      {items
        .filter((x) => x.count > 0)
        .map((x) => (
          <span
            key={x.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
              x.tone === "success" &&
                "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
              x.tone === "danger" &&
                "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
              x.tone === "warning" &&
                "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
              x.tone === "muted" &&
                "border-[var(--color-border-strong)] bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)]",
            )}
          >
            <x.Icon className="h-3 w-3" />
            {x.count.toLocaleString()} {x.label}
          </span>
        ))}
    </div>
  );
}

function CampaignStatusChip({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-success)]">
        <CheckCircle2 className="h-3 w-3" />
        complete
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
        <XCircle className="h-3 w-3" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
      <Clock className="h-3 w-3" />
      {status}
    </span>
  );
}

/** Empty state — first-time users see this. Drives them to the demo
 *  (visual proof) and the composer (real first run). */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Send className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--color-fg-muted)]">
            An outreach campaign scrapes a list of qualifying businesses, finds
            each one&apos;s contact form, fills the standard fields with your
            sender identity, and submits the message. Submission status is
            reported per target — delivered, failed, captcha-blocked, or no form
            found.
          </p>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FeatureBullet
          Icon={Sparkles}
          title="AI fills extra fields"
          description="Beyond name/email/message, an LLM answers any prompt-based fields the form throws at it (e.g. 'how did you hear about us')."
        />
        <FeatureBullet
          Icon={Camera}
          title="Optional screenshots"
          description="Capture a screenshot of each successful submission for receipts. Adds ~1 credit per target."
        />
        <FeatureBullet
          Icon={ShieldX}
          title="Honors anti-bot"
          description="Stops at hCaptcha / reCaptcha walls and reports as captcha_blocked rather than spamming retries."
        />
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/outreach/new">
          <Button>
            <Send className="h-3.5 w-3.5" />
            Start your first campaign
          </Button>
        </Link>
        <Link href="/demo/outreach">
          <Button variant="secondary">
            <Sparkles className="h-3.5 w-3.5" />
            Watch the demo
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-[12px] text-[var(--color-fg-subtle)]">
        Requires <code className="font-mono">SERPAPI_KEY</code> in the
        environment for the contact-form discovery step.
      </p>
    </div>
  );
}

function FeatureBullet({
  Icon,
  title,
  description,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-medium tracking-tight">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-fg-muted)]">
        {description}
      </p>
    </li>
  );
}

export const metadata = {
  title: "Outreach",
  description:
    "Past contact-form submission campaigns. Track delivered / failed / captcha-blocked across every target.",
};
