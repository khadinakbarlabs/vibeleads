/**
 * Motion tokens. All animations in the app should reference these constants
 * so the calm motion language stays consistent.
 *
 * Durations are in milliseconds. Easing curves are CSS cubic-bezier strings
 * (and named `ease.out` etc. for use in JS animations).
 */
export const motion = {
  duration: {
    instant: 120,
    fast: 240,
    base: 400,
    slow: 720,
    breath: 2400, // for the indeterminate progress strip's loop
  },
  ease: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)", // expo-out, our default
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    linear: "linear",
  },
  stagger: {
    tight: 40,
    base: 80,
    loose: 140,
  },
} as const;

/** True when the user has expressed a preference for reduced motion. SSR-safe (returns false on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
