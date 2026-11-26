"use client";

/**
 * Animated number that tweens between previous and target values over a
 * fixed window. Uses `requestAnimationFrame` and the expo-out easing curve.
 *
 * Why not CSS counter? CSS `counter-set` doesn't animate. Why not a third-
 * party lib? We want zero deps for a 50-line primitive.
 */
import { useEffect, useRef, useState } from "react";
import { motion, prefersReducedMotion } from "@/lib/motion/tokens";

interface LiveCounterProps {
  value: number;
  /** Optional precision for floats. Default 0 (integers). */
  decimals?: number;
  /** Tween duration in ms. Default `motion.duration.slow` (720). */
  durationMs?: number;
  className?: string;
  /** ARIA live region politeness. Default "polite". */
  ariaLive?: "polite" | "off";
}

/** Expo-out easing — mirrors the `--ease-out-expo` token. */
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function LiveCounter({
  value,
  decimals = 0,
  durationMs = motion.duration.slow,
  className,
  ariaLive = "polite",
}: LiveCounterProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    // Reduced motion → snap to target via a single RAF tick so the
    // setState call doesn't fire synchronously inside the effect.
    if (prefersReducedMotion()) {
      const handle = requestAnimationFrame(() => {
        fromRef.current = to;
        setDisplay(to);
      });
      return () => cancelAnimationFrame(handle);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutExpo(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-live={ariaLive}>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
