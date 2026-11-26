/**
 * 404 fallback for authenticated routes.
 *
 * Triggered when notFound() is called inside any page in (app)/ — e.g.
 * the search-detail page calls notFound() when the search id doesn't
 * belong to the user's account, or doesn't exist at all.
 *
 * Renders inside the existing sidebar layout so the user can navigate
 * away without losing context.
 */
import Link from "next/link";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-10">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)] text-[var(--color-fg-muted)]">
            <Search className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
              404
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              We couldn&apos;t find that page
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              The link might be old, the resource might have been deleted, or it
              might not belong to your account. Try heading back to the
              dashboard or starting a new outreach campaign.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Button>
          </Link>
          <Link href="/outreach/new">
            <Button variant="secondary">
              <Sparkles className="h-3.5 w-3.5" />
              New campaign
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
