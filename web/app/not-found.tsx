/**
 * Marketing-side 404 fallback.
 *
 * Catches bad URLs outside of (app)/ — typos like /capabilites or
 * deleted blog routes. The (app)/not-found.tsx covers authenticated
 * misses; this one covers the public surface with the same brand
 * language as / and /capabilities.
 *
 * Server component. No layout dependency — stands alone with its own
 * minimal header + footer matching the marketing pages so users keep
 * the brand context while they pick a recovery path.
 */
import Link from "next/link";
import { ArrowLeft, Sparkles, Compass } from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function MarketingNotFound() {
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
          404
        </p>
        <h1 className="mt-3 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 text-balance text-base text-[var(--color-fg-muted)]">
          The link might be old or mistyped. Pick a place to land below — the
          Why VibeLeads page is a good first stop if you&apos;re trying to
          understand what VibeLeads does, and the demo lets you walk the live UI
          without signing up.
        </p>

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
          <Link href="/">
            <Button>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to landing
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--color-border)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-10">
          <p className="text-sm text-[var(--color-fg-subtle)]">
            © {new Date().getFullYear()} VibeLeads
          </p>
          <nav className="flex items-center gap-5 text-sm text-[var(--color-fg-muted)]">
            <Link
              href="/why-vibeleads"
              className="hover:text-[var(--color-fg)]"
            >
              Why VibeLeads
            </Link>
            <Link href="/demo" className="hover:text-[var(--color-fg)]">
              Demo
            </Link>
            <Link href="/login" className="hover:text-[var(--color-fg)]">
              Sign in
            </Link>
            <a
              href="mailto:hello@vibeleads.app"
              className="hover:text-[var(--color-fg)]"
            >
              Contact
            </a>
          </nav>
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

export const metadata = {
  title: "404 — page not found",
  description:
    "We couldn't find that page. Browse the capability catalog or take the live demo.",
};
