import { Wallet } from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { getPlanTier, BILLING_RULES } from "@/lib/billing/plans";
import { BillingClient } from "./billing-client";

export const metadata = {
  title: "Billing",
  description: "Manage VibeLeads plans, credits, and billing activity.",
};

export default async function BillingPage() {
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const [subRes, balanceRes, ledgerRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("account_credit_balance")
      .select("balance")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("credit_ledger")
      .select("delta, reason, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const sub = subRes.data;
  const balance = (balanceRes.data?.balance as number | null) ?? 0;
  const ledger = ledgerRes.data ?? [];
  const currentTier = sub ? getPlanTier(sub.plan) : getPlanTier("free");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
          Billing
        </p>
        <h1 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          Plans, credits, and invoices.
        </h1>
      </div>

      {/* Current plan + balance */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 lg:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Current plan
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {currentTier.label}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {currentTier.tagline}
          </p>
          {sub?.current_period_end && (
            <p className="mt-3 font-mono text-[11px] text-[var(--color-fg-subtle)]">
              Renews {new Date(sub.current_period_end).toLocaleDateString()}
              {sub.cancel_at_period_end && " · cancellation scheduled"}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Credits
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {balance.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            Roll over up to {BILLING_RULES.rolloverCycles}× cycle
          </p>
        </div>
      </section>

      <BillingClient currentPlan={sub?.plan ?? "free"} />

      <section className="mt-14">
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          Recent transactions
        </h3>
        {ledger.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-fg-muted)]">
            No credit activity yet. Run a search to see entries here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {ledger.map((row, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-tight">
                    {labelForReason(row.reason)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${row.delta < 0 ? "text-[var(--color-fg-muted)]" : "text-[var(--color-success)]"}`}
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-[var(--color-fg-subtle)]">
        <Wallet className="mr-1 inline h-3 w-3" />
        Monthly billing. Cancel any time. Credits roll over up to 2×. Failed
        enrichment lookups are auto-refunded.
      </p>
    </div>
  );
}

function labelForReason(reason: string): string {
  const labels: Record<string, string> = {
    signup_grant: "Signup credit",
    subscription_grant: "Subscription credit",
    topup: "Top-up",
    search_run: "Search run",
    lead_normalize: "Lead normalize",
    email_validate: "Email validation",
    phone_normalize: "Phone normalize",
    social_discovery: "Social discovery",
    export_instantly: "Export to Instantly",
    export_webhook: "Webhook export",
    export_csv: "CSV export",
    refund: "Refund",
    manual_adjustment: "Manual adjustment",
  };
  return labels[reason] ?? reason;
}
