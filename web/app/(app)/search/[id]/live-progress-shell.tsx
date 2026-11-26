"use client";

/**
 * Client-side shell that shows live progress while also letting partial
 * outreach receipts appear as the actor writes dataset rows.
 *
 * Why this layout: the progress card stays primary during long actor runs,
 * but the receipts below it refresh as `/api/sync/[id]/poll` upserts rows.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/db/browser";
import { SearchProgress } from "@/components/search/SearchProgress";
import type { Tables } from "@/lib/db/types";

const TERMINAL = new Set(["completed", "failed", "canceled"]);

interface LiveProgressShellProps {
  initialSearch: Tables<"searches">;
  /** The full leads view, rendered once the search reaches a terminal status. */
  resultsSlot: React.ReactNode;
}

export function LiveProgressShell({
  initialSearch,
  resultsSlot,
}: LiveProgressShellProps) {
  const [done, setDone] = useState(() =>
    TERMINAL.has(initialSearch.status as string),
  );
  const [search, setSearch] = useState(initialSearch);
  const lastTotalCountRef = useRef(initialSearch.lead_count ?? 0);
  const router = useRouter();

  // Subscribe to status changes so the parent fetches fresh leads when the
  // run finishes (the progress card already subscribes; we mirror status
  // here to drive the layout swap and trigger a router refresh).
  useEffect(() => {
    if (TERMINAL.has(search.status as string)) {
      // Defer setState off the effect tick — satisfies react-hooks/
      // set-state-in-effect without changing observable behaviour.
      const raf = requestAnimationFrame(() => setDone(true));
      return () => cancelAnimationFrame(raf);
    }
    const supabase = createBrowserSupabase();
    // Per-mount nonce — see status-watcher.tsx for the rationale.
    const nonce = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`search-shell:${initialSearch.id}:${nonce}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "searches",
          filter: `id=eq.${initialSearch.id}`,
        },
        (payload) => {
          const next = payload.new as Tables<"searches">;
          setSearch(next);
          if (TERMINAL.has(next.status as string)) {
            // Re-fetch the SSR slot so the leads list reflects fresh data
            // immediately when the layout swaps.
            router.refresh();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialSearch.id, search.status, router]);

  /**
   * Live-sync poll. While the search is mid-run, hit `/api/sync/[id]/poll`
   * every 4s to pull whatever the Apify actor has scraped so far,
   * normalize it, and upsert into `leads`. The existing realtime
   * subscription on `leads:${searchId}` picks up each INSERT and
   * streams the row into the CRM grid — so the user sees leads appear
   * one-by-one as they're scraped, not in a single end-of-run dump.
   *
   * Idempotency: the upsert is keyed on `(account_id, dedupe_key)` so
   * re-polling never creates duplicates; we just refresh whatever the
   * latest dataset snapshot contains.
   *
   * Bounded by user attention: polling stops as soon as the user
   * navigates away (effect cleanup cancels the timer + abort
   * controllers). No idle background invocations.
   *
   * The poll fires once immediately on mount so the first batch lands
   * in <1s if the actor already has results queued.
   */
  useEffect(() => {
    if (TERMINAL.has(search.status as string)) return;
    let cancelled = false;
    let inFlight = false;
    const controller = new AbortController();
    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/sync/${initialSearch.id}/poll`, {
          method: "POST",
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as {
          totalCount?: number;
        } | null;
        if (
          typeof body?.totalCount === "number" &&
          body.totalCount !== lastTotalCountRef.current
        ) {
          lastTotalCountRef.current = body.totalCount;
          router.refresh();
        }
      } catch {
        // Network blip — ignore, the next tick will retry. Aborts
        // also land here on unmount and are intentionally silent.
      } finally {
        inFlight = false;
      }
    }
    void tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, [initialSearch.id, search.status, router]);

  if (!done) {
    return (
      <div className="space-y-6">
        <SearchProgress
          initial={search}
          onComplete={() => {
            // Tiny grace period so the count-ups settle before the swap.
            setTimeout(() => setDone(true), 450);
          }}
        />
        <div className="motion-safe:animate-fade-in">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
                live receipts
              </p>
            </div>
          </div>
          {resultsSlot}
        </div>
      </div>
    );
  }

  return <div className="motion-safe:animate-fade-in">{resultsSlot}</div>;
}
