"use client";

/**
 * Daily-credit-cap form. Two numeric fields — the hard cap and a
 * soft "warn at" threshold. Empty = use platform default. Updates
 * `accounts.daily_credit_cap` + `accounts.daily_credit_cap_warn_at`
 * via the limits-action server function.
 *
 * Validation is server-side (zod). The client just routes the input
 * via useActionState and surfaces the success/error banner.
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  updateDailyLimits,
  type UpdateLimitsResult,
} from "@/app/(app)/settings/limits-action";

interface LimitsCardProps {
  /** Current per-account hard cap, or null if using the platform default. */
  currentCap: number | null;
  /** Current soft warn threshold, or null if disabled. */
  currentWarnAt: number | null;
  /** Platform default that fires when `currentCap === null`. */
  defaultCap: number;
  /** Today's spend so far — drives the inline "X / cap remaining" status. */
  todaySpent: number;
}

export function LimitsCard({
  currentCap,
  currentWarnAt,
  defaultCap,
  todaySpent,
}: LimitsCardProps) {
  const [state, formAction, pending] = useActionState<
    UpdateLimitsResult | null,
    FormData
  >(updateDailyLimits, null);

  const effectiveCap = currentCap ?? defaultCap;
  const remaining = Math.max(effectiveCap - todaySpent, 0);
  const pctUsed = Math.min((todaySpent / effectiveCap) * 100, 100);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="font-mono uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            today (UTC)
          </span>
          <span className="font-mono tabular-nums text-[var(--color-fg)]">
            {todaySpent.toLocaleString()} / {effectiveCap.toLocaleString()}{" "}
            credits ·{" "}
            <span className="text-[var(--color-fg-muted)]">
              {remaining.toLocaleString()} remaining
            </span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
            style={{ width: `${pctUsed}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Daily hard cap (credits)
          </span>
          <input
            type="number"
            name="dailyCreditCap"
            defaultValue={currentCap ?? ""}
            placeholder={`Default ${defaultCap.toLocaleString()}`}
            min={0}
            step={100}
            className="mt-1.5 block w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-[var(--color-fg-muted)]">
            Blocks new runs once today&apos;s spend hits this. Leave empty for
            the default.
          </span>
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Warn at (credits)
          </span>
          <input
            type="number"
            name="warnAt"
            defaultValue={currentWarnAt ?? ""}
            placeholder="No warning"
            min={0}
            step={100}
            className="mt-1.5 block w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm tabular-nums focus:border-[var(--color-accent)] focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-[var(--color-fg-muted)]">
            Soft threshold below the hard cap. UI shows a banner once crossed.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {state?.error && (
          <p role="alert" className="text-[12px] text-[var(--color-danger)]">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-[12px] text-[var(--color-success)]">
            Saved. New runs use these limits immediately.
          </p>
        )}
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? "Saving…" : "Save limits"}
        </Button>
      </div>
    </form>
  );
}
