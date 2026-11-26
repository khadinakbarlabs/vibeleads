"use client";

/**
 * Cancel-all panic button shown on the dashboard when the account has
 * one or more searches in a non-terminal status. Single click + a 4s
 * confirm window — same arming pattern as the per-search Cancel
 * button on the SearchProgress overlay, so misclicks don't kill
 * expensive runs.
 *
 * After cancel:
 *   - sonner toast confirms count + refunded credits
 *   - router.refresh() re-fetches the dashboard so the banner
 *     disappears immediately
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Square, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cancelAllRunningSearches } from "@/app/(app)/search/cancel-all-action";
import { cn } from "@/lib/utils/cn";

interface CancelAllBannerProps {
  /** Number of non-terminal searches we found in the SSR pre-fetch. */
  runningCount: number;
}

export function CancelAllBanner({ runningCount }: CancelAllBannerProps) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (runningCount <= 0) return null;

  function handle() {
    if (!armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      const res = await cancelAllRunningSearches();
      if (!res.ok) {
        toast.error("Cancel failed", { description: res.error });
        return;
      }
      const credits = res.refunded
        ? ` · refunded ${res.refunded.toLocaleString()} credits`
        : "";
      toast.success(
        `Cancelled ${res.cancelled} ${res.cancelled === 1 ? "search" : "searches"}${credits}`,
      );
      router.refresh();
    });
  }

  return (
    <div
      role="region"
      aria-label="In-flight searches"
      className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 px-4 py-3"
    >
      <div className="flex items-start gap-3 text-sm">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium tracking-tight text-[var(--color-fg)]">
            {runningCount} search{runningCount === 1 ? "" : "es"} in flight
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">
            Stop them now to refund any unspent credits. Already-found leads
            stay in your account.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-label={armed ? "Confirm cancel all" : "Cancel all running"}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium tracking-tight transition-colors",
          armed
            ? "border-[var(--color-danger)] bg-[var(--color-danger)]/12 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-fg)] hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]",
          pending && "cursor-wait opacity-60",
        )}
      >
        <Square className="h-3 w-3" fill="currentColor" />
        {pending
          ? "Cancelling all…"
          : armed
            ? "Confirm cancel all"
            : "Cancel all running"}
      </button>
    </div>
  );
}
