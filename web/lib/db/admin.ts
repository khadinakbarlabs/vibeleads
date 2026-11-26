/**
 * Supabase admin client (service-role). Bypasses RLS — use only in trusted
 * server contexts (cron jobs, webhook handlers, system migrations).
 *
 * Never import this from a Server Component or Server Action that runs as
 * the user. The whole point of RLS is to scope writes to the caller's
 * account_id; the service role short-circuits that.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/lib/db/types";

let _adminClient: SupabaseClient<Database> | null = null;

export function adminSupabase(): SupabaseClient<Database> {
  if (_adminClient) return _adminClient;

  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for webhook handlers, cron jobs, and other server-only admin operations. Copy it from the Supabase dashboard → Project Settings → API → service_role.",
    );
  }

  _adminClient = createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return _adminClient;
}
