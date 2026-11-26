"use client";

/**
 * Marketing-side error boundary.
 *
 * Catches uncaught errors thrown during render in the public surface —
 * everything outside (app)/. That covers / (landing), /login, /capabilities,
 * /capabilities/strategies, /capabilities/scenarios, /capabilities/tasks,
 * /capabilities/health, /capabilities/api, and /demo.
 *
 * The (app)/error.tsx covers authenticated routes and renders inside the
 * sidebar shell. This one covers the public surface and keeps the
 * marketing brand language (matching not-found.tsx at the same level)
 * so a render error on /capabilities still looks intentional rather
 * than dumping users on a default Next.js error page.
 *
 * Must be a Client Component — Next requires that for error.tsx so the
 * `reset` callback can re-render the segment without a full page reload.
 */
import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Compass, RefreshCw, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Browser console gets the stack + digest so users reporting an issue
  // can paste the ref. Sentry (when SENTRY_DSN is set) also captures
  // these automatically before this boundary renders.
  useEffect(() => {
    console.error("[marketing/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <LogoMark size={28} />
          VibeLeads
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/why-vibeleads"
            className="hidden px-3 py-2 text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)] sm:inline"
          >
            Why VibeLeads
          </Link>
          <ThemeToggle size="sm" />
          <Link href="/login">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
          error
        </p>
        <h1 className="mt-3 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          Something broke on this page
        </h1>
        <p className="mt-4 text-balance text-base text-[var(--color-fg-muted)]">
          {humanizeError(error)} The Try again button reloads just this segment;
          if it keeps failing, the links below land on stable pages.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-[var(--color-fg-subtle)]">
            ref: <code>{error.digest}</code>
          </p>
        )}

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RecoveryCard
            href="/why-vibeleads"
            Icon={Compass}
            label="Why VibeLeads"
            hint="How contact-form outreach beats cold email."
          />
          <RecoveryCard
            href="/demo"
            Icon={Sparkles}
            label="Live demo"
            hint="Walk the UI without signing up."
          />
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to landing
            </Button>
          </Link>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--color-border)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-10">
          <p className="text-sm text-[var(--color-fg-subtle)]">
            © {new Date().getFullYear()} VibeLeads
          </p>
          <p className="text-sm text-[var(--color-fg-subtle)]">
            If this keeps happening, ping{" "}
            <a
              href="mailto:hello@vibeleads.app"
              className="underline decoration-dotted underline-offset-2 hover:text-[var(--color-fg-muted)]"
            >
              hello@vibeleads.app
            </a>
            {error.digest ? ` with ref ${error.digest}.` : "."}
          </p>
        </div>
      </footer>
    </div>
  );
}

function RecoveryCard({
  href,
  Icon,
  label,
  hint,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-strong)]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)]">
          <Icon className="h-4 w-4" />
        </span>
        <p className="mt-3 text-sm font-medium tracking-tight">{label}</p>
        <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">{hint}</p>
      </Link>
    </li>
  );
}

/**
 * Map the most common opaque error messages to something a non-developer
 * can understand. Falls back to the raw message if recognizable, then to
 * a generic line if the error is too long or empty.
 *
 * Kept inline rather than imported from (app)/error.tsx — the bundles are
 * separate and the patterns this page sees lean public-surface (Supabase
 * REST blips, hydration mismatches) rather than RLS rejections.
 */
function humanizeError(error: Error): string {
  const msg = error.message ?? "";
  if (/(failed to fetch|network|timeout)/i.test(msg))
    return "We couldn't reach an upstream service.";
  if (/(hydrat|minified react)/i.test(msg))
    return "The page rendered inconsistently between server and browser.";
  if (/(rate limit|too many)/i.test(msg))
    return "Hit a rate limit on this page.";
  if (msg.length > 0 && msg.length < 200) return msg;
  return "An unexpected error happened while rendering this page.";
}
