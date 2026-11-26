/**
 * Shared tone palette for tinted icon backplates (IcpTemplates,
 * /capabilities cards, /demo grid, etc).
 *
 * Each entry is a Tailwind class string that resolves to a pair of
 * theme-aware tokens (`--tone-{name}-bg` + `--tone-{name}-fg`)
 * declared in app/globals.css. Both light and dark themes are
 * covered by the tokens — DO NOT inline raw `oklch()` literals
 * here, they would lock the swatch to a single theme.
 *
 * Adding a new tone:
 *   1. Add `--tone-{name}-bg` + `--tone-{name}-fg` to :root in globals.css
 *   2. Add the dark override under `[data-theme="dark"]` in globals.css
 *   3. Add the entry below
 *   4. Type `Tone` widens automatically via `keyof typeof TONE_CLASS`
 */
export const TONE_CLASS = {
  violet: "bg-[var(--tone-violet-bg)] text-[var(--tone-violet-fg)]",
  rose: "bg-[var(--tone-rose-bg)] text-[var(--tone-rose-fg)]",
  amber: "bg-[var(--tone-amber-bg)] text-[var(--tone-amber-fg)]",
  emerald: "bg-[var(--tone-emerald-bg)] text-[var(--tone-emerald-fg)]",
  indigo: "bg-[var(--tone-indigo-bg)] text-[var(--tone-indigo-fg)]",
  sky: "bg-[var(--tone-sky-bg)] text-[var(--tone-sky-fg)]",
  stone: "bg-[var(--tone-stone-bg)] text-[var(--tone-stone-fg)]",
} as const satisfies Record<string, string>;

export type Tone = keyof typeof TONE_CLASS;
