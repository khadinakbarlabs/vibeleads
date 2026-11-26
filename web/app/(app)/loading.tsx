/**
 * Default loading skeleton for every authenticated route in (app).
 *
 * Renders inside the (app) layout's <main> while a route segment is
 * fetching server data. Matches the rough shape of the most common
 * layouts on these pages — header strip, KPI row, primary card — so
 * the layout doesn't shift when the real content takes over.
 *
 * Next 16 picks this up automatically as the Suspense fallback for any
 * page in this group that triggers loading. Per-route loading.tsx
 * files in deeper segments override this one when they exist.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Header strip — title + subtitle */}
      <div className="mb-10 space-y-3">
        <div
          className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-alt)]"
          aria-hidden
        />
        <div
          className="h-9 w-2/3 animate-pulse rounded bg-[var(--color-bg-alt)]"
          aria-hidden
        />
      </div>

      {/* KPI row — four tiles */}
      <ul className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            aria-hidden
          />
        ))}
      </ul>

      {/* Primary card */}
      <div
        className="mb-6 h-48 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-hidden
      />

      {/* List rows */}
      <ul className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="h-14 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            aria-hidden
          />
        ))}
      </ul>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
