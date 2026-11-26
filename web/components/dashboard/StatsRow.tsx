"use client";

import { LiveCounter } from "@/components/motion/LiveCounter";
import { cn } from "@/lib/utils/cn";

interface Stat {
  label: string;
  /**
   * Number → animated count-up via LiveCounter.
   * String → rendered as-is (use for non-numeric values like dates / status).
   */
  value: string | number;
  hint?: string;
  /** Optional prefix (e.g. "$") rendered tight against the value. */
  prefix?: string;
  /** Optional suffix (e.g. "%", "leads"). */
  suffix?: string;
  /**
   * Direction of recent change: "up" / "down" / "flat". Drives the
   * accent-tinted delta indicator. Pass `null` to suppress.
   */
  trend?: "up" | "down" | "flat" | null;
  /** Human-readable trend caption ("+12% vs last week"). */
  trendLabel?: string | null;
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
      {stats.map((s) => (
        <li key={s.label} className="bg-[var(--color-surface)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            {s.label}
          </p>
          <p className="mt-1.5 flex items-baseline gap-1 text-xl font-semibold tabular-nums tracking-tight">
            {s.prefix && (
              <span className="font-mono text-[var(--color-fg-subtle)]">
                {s.prefix}
              </span>
            )}
            {typeof s.value === "number" ? (
              <LiveCounter value={s.value} />
            ) : (
              <span>{s.value}</span>
            )}
            {s.suffix && (
              <span className="font-mono text-[11px] font-normal text-[var(--color-fg-muted)]">
                {s.suffix}
              </span>
            )}
          </p>
          {(s.hint || s.trendLabel) && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-fg-muted)]">
              {s.trend && (
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex h-3.5 min-w-[14px] items-center justify-center rounded font-mono text-[9px] font-semibold",
                    s.trend === "up" &&
                      "bg-[var(--color-success)]/15 text-[var(--color-success)]",
                    s.trend === "down" &&
                      "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
                    s.trend === "flat" &&
                      "bg-[var(--color-bg-alt)] text-[var(--color-fg-subtle)]",
                  )}
                >
                  {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "—"}
                </span>
              )}
              <span>{s.trendLabel ?? s.hint}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
