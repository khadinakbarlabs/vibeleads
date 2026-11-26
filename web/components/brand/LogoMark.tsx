/**
 * VibeLeads logomark — replaces the "V" placeholder letter that the
 * audit flagged as one of the most visible unfinished surfaces (it
 * appears in every layout header — marketing, app shell, demo, mobile
 * nav, login page).
 *
 * Design: stylized upward sparkline that resolves into a chevron — a
 * subtle nod to lead-pipeline growth and the AI-routing motion. Single
 * accent gradient stroke (no second hue yet — keeps the brand calm,
 * leaves room for a secondary accent later if needed).
 *
 * Tile variant: drawn inside the existing 7×7 violet square so the
 * footprint stays identical to the placeholder. Wordmark variant: just
 * the SVG mark next to the type, no tile, for use beside the
 * "VibeLeads" text in nav headers.
 */
import { cn } from "@/lib/utils/cn";

interface LogoMarkProps {
  /**
   * "tile" — the existing accent square, 28px default. Swaps inside the
   *           tile so call sites don't have to change their layout.
   * "mono"  — just the mark, currentColor stroke, transparent bg. Use
   *           when you want it inline next to type.
   */
  variant?: "tile" | "mono";
  /** Size in px. Default 28 for tile, 18 for mono. */
  size?: number;
  className?: string;
  /** Optional tile background color override (defaults to --color-accent). */
  tileBg?: string;
}

export function LogoMark({
  variant = "tile",
  size,
  className,
  tileBg,
}: LogoMarkProps) {
  if (variant === "tile") {
    const px = size ?? 28;
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-md text-[var(--color-accent-fg)]",
          className,
        )}
        style={{
          width: px,
          height: px,
          backgroundColor: tileBg ?? "var(--color-accent)",
        }}
      >
        <svg
          width={Math.round(px * 0.6)}
          height={Math.round(px * 0.6)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Chevron + accent peak: two strokes that read as a stylized "V"
              but tilted forward to suggest motion / lead pipeline ascent. */}
          <path d="M4 7 L12 19 L20 5" />
          <path d="M16 9 L20 5 L20 11" />
        </svg>
      </span>
    );
  }
  const px = size ?? 18;
  return (
    <svg
      aria-hidden
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 7 L12 19 L20 5" />
      <path d="M16 9 L20 5 L20 11" />
    </svg>
  );
}
