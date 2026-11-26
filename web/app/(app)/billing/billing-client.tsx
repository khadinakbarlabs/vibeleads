"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { PLAN_TIERS, BILLING_RULES } from "@/lib/billing/plans";
import { PlanCard } from "@/components/billing/PlanCard";
import { startCheckout, openCustomerPortal } from "./actions";

interface BillingClientProps {
  currentPlan: string;
}

export function BillingClient({ currentPlan }: BillingClientProps) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [pending, startTransition] = useTransition();

  function pickPlan(plan: "starter" | "pro" | "scale") {
    startTransition(async () => {
      const res = await startCheckout({ plan, cycle });
      if (res.ok) {
        window.location.href = res.url;
      } else {
        toast.error(res.error);
      }
    });
  }

  function manage() {
    startTransition(async () => {
      const res = await openCustomerPortal();
      if (res && "ok" in res && !res.ok) toast.error(res.error);
      // success → server action redirects, we never reach here
    });
  }

  return (
    <section className="mt-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Plans</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Monthly billing, no annual lock-in. Save{" "}
            {BILLING_RULES.annualDiscountPercent}% on annual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              cycle === "monthly"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              cycle === "annual"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            Annual{" "}
            <span className="ml-1 font-mono text-[10px] opacity-80">−17%</span>
          </button>
        </div>
      </header>

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLAN_TIERS.map((tier) => (
          <li key={tier.id}>
            <PlanCard
              tier={tier}
              billingCycle={cycle}
              currentPlan={currentPlan}
              pending={pending}
              onSelect={() => pickPlan(tier.id)}
            />
          </li>
        ))}
      </ul>

      {currentPlan !== "free" && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={manage}
            disabled={pending}
            className="text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
          >
            Manage billing in Stripe →
          </button>
        </div>
      )}
    </section>
  );
}
