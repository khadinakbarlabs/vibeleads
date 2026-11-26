"use client";

/**
 * Marketing pricing section. Mirrors the in-app billing PlanCard but skips
 * any auth-gated controls — the CTA routes to /login (unified sign-in/sign-up).
 *
 * The audit flagged: "marketing home goes hero → features → footer with
 * no pricing. Every evaluation-stage visitor must sign up to see cost."
 * This closes that gap.
 */
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_TIERS, BILLING_RULES } from "@/lib/billing/plans";
import { cn } from "@/lib/utils/cn";

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="pt-10 pb-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
          Pricing
        </p>
        <h2 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h2)]">
          Pay only for messages that send.
        </h2>
        <p className="mt-3 text-balance text-base text-[var(--color-fg-muted)]">
          Forms we can&apos;t submit — CAPTCHA-walled or form-less — are never
          charged. Credits roll over up to 2× your monthly grant. Cancel anytime
          — no annual lock-in.
        </p>
      </header>

      {/* What does a credit actually buy? */}
      <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
        <li className="bg-[var(--color-surface)] p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            ~1 credit
          </p>
          <p className="mt-1 text-sm font-medium tracking-tight">
            One message sent
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            Found, written, and submitted for you
          </p>
        </li>
        <li className="bg-[var(--color-surface)] p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            ~2 credits
          </p>
          <p className="mt-1 text-sm font-medium tracking-tight">
            Message + proof shot
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            Screenshot receipt for client work
          </p>
        </li>
        <li className="bg-[var(--color-surface)] p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            0 credits
          </p>
          <p className="mt-1 text-sm font-medium tracking-tight">
            Blocked or no form
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
            CAPTCHA + form-less sites — never charged
          </p>
        </li>
      </ul>

      {/* Cycle toggle */}
      <div className="mx-auto mt-8 inline-flex w-full justify-center">
        <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-3.5 py-1 transition-colors",
              !annual
                ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-3.5 py-1 transition-colors",
              annual
                ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            Annual
            <span className="ml-1 font-mono text-[10px] opacity-80">
              −{BILLING_RULES.annualDiscountPercent}%
            </span>
          </button>
        </div>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLAN_TIERS.map((p) => {
          const price = annual ? p.annualUsd : p.monthlyUsd;
          return (
            <li key={p.id}>
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6 transition-colors",
                  p.highlight
                    ? "border-[var(--color-accent)]/40 bg-[var(--color-surface)] shadow-[0_24px_64px_-32px_oklch(56%_0.22_274_/_0.35)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
                )}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-6 inline-flex rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent-fg)]">
                    Most picked
                  </span>
                )}
                <header>
                  <h3 className="text-base font-semibold tracking-tight">
                    {p.label}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                    {p.tagline}
                  </p>
                </header>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-mono text-[32px] font-semibold tabular-nums tracking-tight">
                    ${price}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
                    /{annual ? "mo billed yearly" : "mo"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                  {p.monthlyCredits.toLocaleString()} credits / month ·{" "}
                  {p.seats} {p.seats === 1 ? "seat" : "seats"}
                </p>

                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[var(--color-fg)]"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0",
                          p.highlight
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-fg-muted)]",
                        )}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Link
                    href="/login"
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md text-sm font-medium tracking-tight transition-colors",
                      p.highlight
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]"
                        : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)]",
                    )}
                  >
                    Start {p.label.toLowerCase()}
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-xs text-[var(--color-fg-subtle)]">
        All plans include refund-on-failed-lookup, role-account email hygiene at
        export, and source-transparent enrichment metadata. Annual billed
        upfront; cancel anytime, keeps current credits until cycle end.
      </p>
    </section>
  );
}
