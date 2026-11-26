/**
 * Supabase server client for Server Components, Route Handlers, and Server
 * Actions. Reads the user session from cookies and refreshes tokens
 * automatically.
 */
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `set` was called from a Server Component. Safe to ignore here —
            // the middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
