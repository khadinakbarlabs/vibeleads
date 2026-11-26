/**
 * Anthropic client singleton. All Claude calls go through here so caching
 * headers, model selection, and rate-limit handling stay centralized.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env.server";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  if (!serverEnv.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (dev) or Vercel env (prod).",
    );
  }
  _client = new Anthropic({
    apiKey: serverEnv.ANTHROPIC_API_KEY,
    // Claude 4 family uses extended caching by default; no special headers
    // required as of @anthropic-ai/sdk 0.94.x.
  });
  return _client;
}

export const MODELS = {
  haiku: serverEnv.ANTHROPIC_MODEL_HAIKU,
  sonnet: serverEnv.ANTHROPIC_MODEL_SONNET,
  opus: serverEnv.ANTHROPIC_MODEL_OPUS,
} as const;
