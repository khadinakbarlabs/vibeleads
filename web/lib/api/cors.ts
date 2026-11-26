/**
 * CORS helpers for the public `/api/capabilities/*` and `/api/mcp`
 * endpoints.
 *
 * These routes are deliberately public (no auth) and expose only the
 * deployed registry data plus the deterministic `decide()` function.
 * That means browser-based clients (web MCP UIs, in-page integrations)
 * are valid callers — and they need CORS headers to make cross-origin
 * fetch calls without a proxy.
 *
 * Policy:
 *   Access-Control-Allow-Origin: *
 *     The data is fully public — same shape as the rendered
 *     /capabilities/* pages — so there's nothing to protect by origin.
 *   Access-Control-Allow-Methods: GET, HEAD, POST, OPTIONS
 *     Covers the full method surface of the public routes (HEAD is
 *     used by /api/health for status-code-only uptime probes).
 *   Access-Control-Allow-Headers: Content-Type
 *     POST bodies are JSON; no custom auth headers are accepted.
 *   Access-Control-Max-Age: 86400
 *     Lets browsers cache the preflight result for 24h, reducing
 *     round-trips for repeat callers.
 *
 * Use:
 *   import { CORS_HEADERS, handleOptions } from "@/lib/api/cors";
 *   export const OPTIONS = handleOptions;
 *   // ... in your handler:
 *   return NextResponse.json(body, { headers: { ...CORS_HEADERS, ... } });
 */
import { NextResponse } from "next/server";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Generic OPTIONS preflight handler. Empty body, just the CORS headers. */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
