/**
 * Apify client singleton. Server-only — APIFY_TOKEN must never reach the
 * browser bundle.
 */
import "server-only";
import { ApifyClient } from "apify-client";
import { serverEnv } from "@/lib/env.server";

let _client: ApifyClient | null = null;

export function apify(): ApifyClient {
  if (_client) return _client;
  if (!serverEnv.APIFY_TOKEN) {
    throw new Error(
      "APIFY_TOKEN is not set. Add it to .env.local (dev) or Vercel env (prod).",
    );
  }
  _client = new ApifyClient({ token: serverEnv.APIFY_TOKEN });
  return _client;
}
