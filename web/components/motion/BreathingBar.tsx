"use client";

/**
 * Indeterminate "breathing" progress strip. Renders a horizontal track with
 * a 30%-wide gradient block translating from -30% → 130% over 2.4s on a
 * loop. Swaps to a deterministic mode (transform: scaleX) when a
 * `value` is supplied.
 *
 * Compositor-friendly: only `transform` and `opacity` are animated.
 * Honors `prefers-reduced-motion` by freezing the gradient block in the
 * center at 60% opacity.
 */
import { cn } from "@/lib/utils/cn";

interface BreathingBarProps {
  /** Optional 0..1 value to switch to deterministic mode. */
  value?: number;
  /** Visual height in px. Default 4. */
  height?: number;
  className?: string;
  /** Accent color CSS var name without the leading `--`. Default `color-accent`. */
  accent?: string;
}

export function BreathingBar({
  value,
  height = 4,
  className,
  accent = "color-accent",
}: BreathingBarProps) {
  const isDeterministic = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={isDeterministic ? 1 : undefined}
      aria-valuenow={isDeterministic ? value : undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]",
        className,
      )}
      style={{ height }}
    >
      {isDeterministic ? (
        <div
          className="h-full origin-left rounded-full transition-transform duration-[400ms] ease-[var(--ease-out-expo)]"
          style={{
            backgroundColor: `var(--${accent})`,
            transform: `scaleX(${Math.max(0, Math.min(1, value))})`,
          }}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-y-0 w-[30%] rounded-full",
            "motion-reduce:left-1/2 motion-reduce:-translate-x-1/2 motion-reduce:opacity-60",
            "motion-safe:animate-[breathing-bar_2400ms_cubic-bezier(0.65,0,0.35,1)_infinite]",
          )}
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, var(--${accent}) 50%, transparent 100%)`,
          }}
        />
      )}
    </div>
  );
}
