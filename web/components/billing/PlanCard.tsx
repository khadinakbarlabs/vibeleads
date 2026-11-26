"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/lib/billing/plans";

interface PlanCardProps {
  tier: PlanTier;
  billingCycle: "monthly" | "annual";
  currentPlan?: string;
  onSelect?: () => void;
  pending?: boolean;
}

export function PlanCard({
  tier,
  billingCycle,
  currentPlan,
  onSelect,
  pending,
}: PlanCardProps) {
  const price = billingCycle === "annual" ? tier.annualUsd : tier.monthlyUsd;
  const isCurrent = currentPlan === tier.id;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-[var(--color-surface)] p-6 transition-colors",
        tier.highlight
          ? "border-[var(--color-accent)] shadow-[0_24px_48px_-24px_oklch(56%_0.22_274_/_0.30)]"
          : "border-[var(--color-border)]",
      )}
    >
      {tier.highlight && (
        <span className="absolute -top-3 right-6 rounded-full bg-[var(--color-accent)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-fg)]">
          most popular
        </span>
      )}

      <header>
        <h3 className="text-lg font-semibold tracking-tight">{tier.label}</h3>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {tier.tagline}
        </p>
      </header>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-[-0.02em] tabular-nums">
          ${price}
        </span>
        <span className="text-sm text-[var(--color-fg-muted)]">/mo</span>
        {billingCycle === "annual" && (
          <span className="ml-2 rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            saves ${(tier.monthlyUsd - tier.annualUsd) * 12}/yr
          </span>
        )}
      </div>
      {billingCycle === "annual" && (
        <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
          billed yearly at ${tier.annualUsd * 12}
        </p>
      )}

      <ul className="mt-6 space-y-2 text-sm">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
            <span className="text-[var(--color-fg-muted)]">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        {isCurrent ? (
          <div className="flex h-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-alt)] text-sm text-[var(--color-fg-muted)]">
            Current plan
          </div>
        ) : (
          <Button
            onClick={onSelect}
            variant={tier.highlight ? "primary" : "secondary"}
            size="lg"
            className="w-full"
            disabled={pending || !onSelect}
          >
            {pending ? "…" : currentPlan ? "Switch to this" : "Get started"}
          </Button>
        )}
      </div>
    </article>
  );
}
