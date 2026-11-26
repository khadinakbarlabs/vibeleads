import Link from "next/link";
import { ArrowUpRight, SendHorizonal } from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { OutreachHero } from "@/components/dashboard/OutreachHero";
import { OutreachTemplates } from "@/components/dashboard/OutreachTemplates";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { CancelAllBanner } from "@/components/dashboard/CancelAllBanner";
import { OutreachOnboarding } from "@/components/dashboard/OutreachOnboarding";
import { getBusinessProfile } from "@/lib/profile/queries";

export const metadata = {
  title: "Dashboard",
  description:
    "Launch a new contact-form outreach campaign, review recent runs, and monitor workspace activity.",
};

const OUTREACH_INTENT = "contact_form_submit";

export default async function DashboardPage() {
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  // 30-day window for usage stats. `new Date()` (not Date.now()) keeps the
  // react-hooks/purity lint happy in this server component.
  const now = new Date();
  const last30d = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    campaignsRes,
    balanceRes,
    campaignAggRes,
    runningCountRes,
    accountRes,
    profile,
  ] = await Promise.all([
    // Recent campaigns — the only surface. Lead-gen is hidden for now.
    supabase
      .from("searches")
      .select("id, prompt, status, lead_count, created_at, outreach")
      .eq("account_id", accountId)
      .eq("intent", OUTREACH_INTENT)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("account_credit_balance")
      .select("balance")
      .eq("account_id", accountId)
      .maybeSingle(),
    // Last-30-days campaigns for the stats row (delivered + count).
    supabase
      .from("searches")
      .select("lead_count, outcome_counts")
      .eq("account_id", accountId)
      .eq("intent", OUTREACH_INTENT)
      .gte("created_at", last30d)
      .limit(200),
    // Count non-terminal campaigns → drives the "Cancel all running" panic
    // button when there's something to cancel.
    supabase
      .from("searches")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .in("status", ["routing", "running", "normalizing", "enriching"]),
    // Account age gates the onboarding checklist.
    supabase
      .from("accounts")
      .select("created_at")
      .eq("id", accountId)
      .maybeSingle(),
    getBusinessProfile(),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const balance = (balanceRes.data?.balance as number | null) ?? 0;

  const campaignAgg = (campaignAggRes.data ?? []) as Array<{
    lead_count: number | null;
    outcome_counts: { delivered?: number } | null;
  }>;
  const campaignCount30d = campaignAgg.length;
  // Delivered = messages that actually went through the form. Failed /
  // captcha / no-form submissions are excluded (they don't reach anyone).
  const delivered30d = campaignAgg.reduce(
    (sum, r) => sum + (r.outcome_counts?.delivered ?? 0),
    0,
  );

  const runningCount = runningCountRes.count ?? 0;
  const accountCreatedAt =
    (accountRes.data?.created_at as string | null) ?? now.toISOString();
  const onboardingWithinWindow =
    (now.getTime() - new Date(accountCreatedAt).getTime()) / 86_400_000 <= 21;
  const hasProfile = profile != null;
  const hasCampaign = campaigns.length > 0;
  const hasDelivered = delivered30d > 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
          Outreach
        </p>
        <h1 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          Who do you want to reach?
        </h1>
      </div>

      {/* Panic-button banner — appears only when a run is non-terminal. */}
      <CancelAllBanner runningCount={runningCount} />

      <LowCreditBanner balance={balance} />

      <OutreachOnboarding
        hasProfile={hasProfile}
        hasCampaign={hasCampaign}
        hasDelivered={hasDelivered}
        withinWindow={onboardingWithinWindow}
        credits={balance}
      />

      <OutreachHero />

      <div className="mt-10">
        <OutreachTemplates />
      </div>

      <div className="mt-10">
        <StatsRow
          stats={[
            {
              label: "Credits",
              value: balance,
              trend: balance > 0 ? "flat" : "down",
              trendLabel:
                balance > 0
                  ? "≈ 1 credit per message"
                  : "Top up to keep sending",
            },
            {
              label: "Delivered",
              value: delivered30d,
              trend: delivered30d > 0 ? "up" : "flat",
              trendLabel:
                delivered30d > 0
                  ? `Messages delivered across ${campaignCount30d} ${campaignCount30d === 1 ? "campaign" : "campaigns"} (30d)`
                  : "Launch your first campaign above",
            },
            {
              label: "Campaigns",
              value: campaignCount30d,
              trend: campaignCount30d > 0 ? "up" : "flat",
              trendLabel: "In the last 30 days",
            },
          ]}
        />
      </div>

      <section className="mt-14">
        <header className="mb-5 flex items-baseline justify-between">
          <h3 className="text-base font-semibold tracking-tight">
            Recent campaigns
          </h3>
          {campaigns.length > 0 && (
            <Link
              href="/outreach"
              className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
            >
              All campaigns
            </Link>
          )}
        </header>

        {campaigns.length === 0 ? (
          <CampaignEmptyState />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {campaigns.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/search/${s.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-bg-alt)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {s.prompt}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-subtle)]">
                      <span>{new Date(s.created_at).toLocaleString()}</span>
                      <span className="opacity-50">·</span>
                      <span>{s.status}</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-[var(--color-fg-muted)]">
                    <SendHorizonal className="h-3.5 w-3.5" />
                    {s.lead_count ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Low-credit nudge (CRO). Surfaces only when the balance is low so users
 * top up before a campaign stalls mid-send. Hidden above the threshold.
 */
function LowCreditBanner({ balance }: { balance: number }) {
  if (balance > 50) return null;
  const out = balance <= 0;
  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        out
          ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5"
          : "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5"
      }`}
    >
      <p className="text-sm">
        <span className="font-semibold">
          {out ? "You're out of credits." : `Only ${balance} credits left.`}
        </span>{" "}
        <span className="text-[var(--color-fg-muted)]">
          {out
            ? "Top up to launch your next campaign."
            : "Top up so your next campaign doesn't stall mid-send."}
        </span>
      </p>
      <Link
        href="/billing"
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)] transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Top up
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function CampaignEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-10 text-center">
      <p className="text-sm text-[var(--color-fg-muted)]">
        No campaigns yet. Describe a target above, or{" "}
        <Link
          href="/demo/outreach"
          className="inline-flex items-center gap-1 text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          watch a demo campaign run
          <ArrowUpRight className="h-3 w-3" />
        </Link>{" "}
        first.
      </p>
    </div>
  );
}
