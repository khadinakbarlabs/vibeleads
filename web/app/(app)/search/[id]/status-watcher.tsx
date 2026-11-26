"use client";

/**
 * Subscribes to UPDATE events on the search row and refreshes the page
 * when the status transitions to a terminal state (completed/failed/canceled).
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/db/browser";

const TERMINAL = new Set(["completed", "failed", "canceled"]);

export function SearchStatusWatcher({ searchId }: { searchId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    // Per-mount nonce on the channel name. Without it, React 19 strict-mode
    // double-mount (and any rapid re-subscribe in prod) lands the second
    // mount's `.on()` on a channel that's already in `joined` state, and
    // Supabase throws "cannot add postgres_changes callbacks after subscribe()".
    const nonce = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`search:${searchId}:${nonce}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "searches",
          filter: `id=eq.${searchId}`,
        },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status && TERMINAL.has(status)) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchId, router]);

  return null;
}
