/**
 * App-side re-export of the native discovery layer. The implementation
 * lives in `submitter/src/discover.ts` so the engine + the app stay in
 * sync (one source of truth for contact-page resolution + noise filter).
 *
 * Discovery is pure fetch + SerpAPI — no browser — so it runs fine
 * inside a Vercel serverless function. Only the *submission* step needs
 * Trigger.dev / Playwright.
 */
import "server-only";

export {
  discoverTargets as discoverNativeTargets,
  type DiscoverInput,
  type DiscoverResult,
  type TargetUrl,
} from "../../submitter/src/discover";
