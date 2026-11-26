/**
 * System health probe.
 *
 * Different from `/api/capabilities/health`, which reports on the
 * strategy/actor/task registries (a content-layer health). This one is
 * the system-layer probe — what an uptime monitor (BetterUptime,
 * Pingdom, Vercel cron health, internal status pages) hits to verify:
 *
 *   1. The Next.js process is alive and serving traffic.
 *   2. We can reach Supabase (the only hard dependency for any logged-in
 *      flow). Apify and Anthropic aren't pinged — those are scrape-time
 *      dependencies, not "is the app up" dependencies, and pinging them
 *      from a public health endpoint would burn budget.
 *
 * Response envelope:
 *   {
 *     status: "ok" | "degraded",
 *     version: <commit sha or "local">,
 *     timestamp: <iso>,
 *     uptimeSeconds: <process uptime>,
 *     checks: { supabase: { status, latencyMs?, error? } }
 *   }
 *
 * Status codes:
 *   200 — all checks pass (status: "ok")
 *   503 — any required check fails (status: "degraded")
 *
 * Auth: public — uptime monitors don't carry credentials. Internal
 * checks use the service-role admin client, which never leaves the
 * server. The PUBLIC response only surfaces a bounded error string
 * (no stack, no SQL); leaking detail here would help attackers map
 * our infrastructure.
 *
 * Cache: no-store. The whole point is a fresh signal — a CDN-cached
 * "ok" while the DB is actually down would be worse than no probe.
 *
 * CORS: same headers as the other public routes so a status page on a
 * different origin can fetch this directly.
 */
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/db/admin";
import { CORS_HEADERS, handleOptions } from "@/lib/api/cors";

export const OPTIONS = handleOptions;

/** Hard ceiling on the Supabase ping. Past this we report "degraded"
 *  rather than letting the probe hang the monitor. Picked at 3s so the
 *  probe still reflects real latency under load but stays well under
 *  typical 10s monitor timeouts. */
const SUPABASE_PING_TIMEOUT_MS = 3000;

/** Best-effort "version" identifier. Vercel sets this on every
 *  deployment automatically; locally it falls through to "local". */
function getVersion(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.npm_package_version ??
    "local"
  );
}

interface SupabaseCheck {
  status: "ok" | "fail";
  latencyMs?: number;
  /** Bounded, sanitized error string. Never leak SQL or stack traces. */
  error?: string;
}

/** Ping Supabase with a tiny read against `accounts` using the admin
 *  client (RLS bypass is fine — we're not returning rows, just probing
 *  reachability). `head: true` + `count: 'exact'` runs a COUNT without
 *  shipping any row data back. */
async function pingSupabase(): Promise<SupabaseCheck> {
  const started = performance.now();
  try {
    const result = await Promise.race([
      adminSupabase()
        .from("accounts")
        .select("id", { count: "exact", head: true }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("supabase ping timeout")),
          SUPABASE_PING_TIMEOUT_MS,
        ),
      ),
    ]);
    const latencyMs = Math.round(performance.now() - started);

    if (result.error) {
      return {
        status: "fail",
        latencyMs,
        error: sanitizeError(result.error.message),
      };
    }
    return { status: "ok", latencyMs };
  } catch (err) {
    return {
      status: "fail",
      latencyMs: Math.round(performance.now() - started),
      error: sanitizeError(err instanceof Error ? err.message : String(err)),
    };
  }
}

/** Trim error messages to a safe prefix. Keeps the high-level signal
 *  ("timeout", "unauthorized", "network") without revealing schema
 *  details, IPs, or internal paths. */
function sanitizeError(raw: string): string {
  const trimmed = raw.slice(0, 80);
  return trimmed.length === raw.length ? trimmed : trimmed + "…";
}

export async function GET() {
  const supabase = await pingSupabase();

  const allOk = supabase.status === "ok";
  const status = allOk ? "ok" : "degraded";

  const body = {
    status,
    version: getVersion(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: { supabase },
  } as const;

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/** HEAD probe — uptime monitors that only care about the status code
 *  use HEAD to skip the JSON body. Same logic as GET, no body. */
export async function HEAD() {
  const supabase = await pingSupabase();
  const allOk = supabase.status === "ok";
  return new NextResponse(null, {
    status: allOk ? 200 : 503,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
    },
  });
}
