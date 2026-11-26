"use client";

/**
 * Vertical step rail rendered to the left of long-running async pipelines.
 * Each step is `pending`, `active`, or `done`. The active step has a
 * subtle vertical beam-sweep behind it and the label has the accent color.
 *
 * Layout: 32-col gap on the left for the dot/connector, content fills
 * the rest. The connector line is drawn with a CSS gradient on a
 * pseudo-element so it doesn't pull a div.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TraceStep {
  id: string;
  label: string;
  state: "pending" | "active" | "done";
  /** Optional one-line detail under the label (e.g. count, eta). */
  detail?: string | null;
}

interface AgentTraceProps {
  steps: TraceStep[];
  className?: string;
}

export function AgentTrace({ steps, className }: AgentTraceProps) {
  return (
    <ol
      className={cn(
        "relative space-y-3 border-l border-dashed border-[var(--color-border-strong)] pl-6",
        className,
      )}
      aria-label="Pipeline progress"
    >
      {steps.map((step) => (
        <li key={step.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[31px] top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[var(--color-bg)] transition-colors duration-[400ms]",
              step.state === "done" &&
                "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
              step.state === "active" &&
                "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
              step.state === "pending" && "bg-[var(--color-bg-alt)]",
            )}
          >
            {step.state === "done" ? (
              <Check className="h-3 w-3" />
            ) : step.state === "active" ? (
              <span className="motion-safe:animate-[calm-pulse_1600ms_ease-in-out_infinite] inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            ) : null}
          </span>
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border bg-[var(--color-bg)] px-3 py-2 transition-colors",
              step.state === "active"
                ? "border-[var(--color-accent)]/30"
                : "border-[var(--color-border)]",
              step.state === "pending" && "opacity-60",
            )}
          >
            {step.state === "active" && (
              <span
                aria-hidden
                className="motion-safe:animate-[beam-sweep_1800ms_cubic-bezier(0.65,0,0.35,1)_infinite] pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[var(--color-accent)]/50 to-transparent"
              />
            )}
            <p
              className={cn(
                "text-sm font-medium tracking-tight",
                step.state === "active" && "text-[var(--color-fg)]",
                step.state === "pending" && "text-[var(--color-fg-muted)]",
              )}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                {step.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
