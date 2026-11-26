import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { Button } from "@/components/ui/button";
import { LimitsCard } from "@/components/settings/LimitsCard";
import { SenderProfileCard } from "@/components/settings/SenderProfileCard";
import { getBusinessProfile } from "@/lib/profile/queries";
import { serverEnv } from "@/lib/env.server";

export const metadata = {
  title: "Settings",
  description: "Manage workspace access, billing, and spend limits.",
};

export default async function SettingsPage() {
  const { user, accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const [{ data: account }, { data: spendRow }, profile] = await Promise.all([
    supabase
      .from("accounts")
      .select("name, created_at, daily_credit_cap, daily_credit_cap_warn_at")
      .eq("id", accountId)
      .maybeSingle(),
    supabase
      .from("account_today_spend")
      .select("credits_spent_today")
      .eq("account_id", accountId)
      .maybeSingle(),
    getBusinessProfile(),
  ]);
  const todaySpent = Number(spendRow?.credits_spent_today ?? 0);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
          Settings
        </p>
        <h1 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          Account & access.
        </h1>
      </div>

      <section className="space-y-6">
        <SenderProfileCard profile={profile} />

        <Card title="Account">
          <Field label="Workspace" value={account?.name ?? "—"} />
          <Field label="Email" value={user.email ?? "—"} />
          <Field
            label="Created"
            value={
              account?.created_at
                ? new Date(account.created_at).toLocaleString()
                : "—"
            }
          />
          <Field label="Account ID" value={accountId} mono />
        </Card>

        <Card title="Limits">
          <LimitsCard
            currentCap={account?.daily_credit_cap ?? null}
            currentWarnAt={account?.daily_credit_cap_warn_at ?? null}
            defaultCap={serverEnv.DEFAULT_DAILY_CREDIT_CAP}
            todaySpent={todaySpent}
          />
        </Card>

        <Card
          title="Billing"
          action={
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
            >
              Manage
              <ExternalLink className="h-3 w-3" />
            </Link>
          }
        >
          <p className="text-sm text-[var(--color-fg-muted)]">
            View plan, credits, and recent transactions on the billing page.
          </p>
        </Card>

        <Card title="Danger zone">
          <form
            action="/auth/sign-out"
            method="post"
            className="flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-medium tracking-tight">Sign out</p>
              <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                Signs you out of this browser.
              </p>
            </div>
            <Button type="submit" variant="secondary">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </header>
      {children}
    </article>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] py-2.5 last:border-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd
        className={`text-sm text-[var(--color-fg)] ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
