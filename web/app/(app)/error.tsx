"use client";

/**
 * Authenticated-route error boundary.
 *
 * Catches uncaught errors thrown during render (server or client) for
 * any page in (app)/ — dashboard, search, lists, exports, integrations,
 * billing, settings. Renders inside the existing sidebar layout so users
 * stay oriented and can navigate away.
 *
 * Common errors caught here:
 *  - Supabase RLS rejections that bubble up unhandled
 *  - Network blips during route data fetch
 *  - Type mismatches in DB rows after a schema change
 *
 * Must be a Client Component — Next requires that for error.tsx so the
 * `reset` callback can re-render the segment without a full page reload.
 */
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to the browser console with the digest so users reporting an
  // issue can paste it. The Sentry wiring (when SENTRY_DSN is set)
  // would also pick this up automatically — Next forwards uncaught
  // errors before this boundary runs.
  useEffect(() => {
    console.error("[(app)/error]", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-8 sm:p-10">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-bg)] text-[var(--color-danger)]">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
              error
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              {humanizeError(error)}
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                ref: <code>{error.digest}</code>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-[var(--color-fg-subtle)]">
        If this keeps happening, ping{" "}
        <a
          href="mailto:hello@vibeleads.app"
          className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-fg-muted)]"
        >
          hello@vibeleads.app
        </a>{" "}
        with the ref above.
      </p>
    </div>
  );
}

/**
 * Map common opaque error messages to something a non-developer can
 * understand. Falls back to the raw message if we don't recognize it.
 */
function humanizeError(error: Error): string {
  const msg = error.message ?? "";
  if (/insufficient_credits/i.test(msg))
    return "You don't have enough credits to run this. Top up in Billing.";
  if (/(failed to fetch|network|timeout)/i.test(msg))
    return "We couldn't reach an upstream service. The Try again button should work in a few seconds.";
  if (/(permission denied|rls|row level)/i.test(msg))
    return "You don't have access to this resource. If this looks wrong, sign out and back in.";
  if (/(rate limit|too many)/i.test(msg))
    return "Hit a rate limit. Try again in a minute.";
  if (msg.length > 0 && msg.length < 200) return msg;
  return "An unexpected error happened. The Try again button reloads this page without losing your sidebar context.";
}
