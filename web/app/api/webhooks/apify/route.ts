/**
 * Apify webhook handler — delegates to lib/searches/finalize for the heavy
 * lifting so cron sweeps and webhooks stay in lockstep.
 *
 * Auth: when APIFY_WEBHOOK_SECRET is set, we verify the
 * X-Apify-Webhook-Token header (or `?token=` query param fallback). Apify
 * lets you attach a static token to outgoing webhooks.
 */
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { adminSupabase } from "@/lib/db/admin";
import { finalizeSucceeded, finalizeFailed } from "@/lib/searches/finalize";
import { serverEnv } from "@/lib/env.server";
import type { Intent } from "@/lib/apify/actors";

interface ApifyWebhookPayload {
  eventType?: string;
  resource?: {
    id?: string;
    actId?: string;
    status?: string;
    defaultDatasetId?: string;
    statusMessage?: string;
  };
}

export async function POST(request: NextRequest) {
  const expected = serverEnv.APIFY_WEBHOOK_SECRET;
  if (!expected) {
    // A callback endpoint that accepts unauthenticated finalization events is
    // worse than no callback at all. Cron remains the recovery path until the
    // deployment is configured with an Apify webhook token.
    return NextResponse.json(
      { error: "webhook_secret_not_configured" },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-apify-webhook-token") ??
    request.nextUrl.searchParams.get("token");
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const searchId = request.nextUrl.searchParams.get("search");
  if (!searchId) {
    return NextResponse.json({ error: "missing search id" }, { status: 400 });
  }

  let payload: ApifyWebhookPayload;
  try {
    payload = (await request.json()) as ApifyWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const status = payload.resource?.status ?? "";
  const datasetId = payload.resource?.defaultDatasetId;

  const supabase = adminSupabase();
  const { data: search } = await supabase
    .from("searches")
    .select(
      "id, account_id, intent, actor_run_id, credits_estimated, credits_spent",
    )
    .eq("id", searchId)
    .maybeSingle();

  if (!search) {
    return NextResponse.json({ error: "search not found" }, { status: 404 });
  }

  // The webhook token authorizes Apify itself; this binds the event to the
  // specific run this campaign started and prevents a valid callback from one
  // run finalizing a different search.
  if (
    payload.resource?.id &&
    payload.resource.id !== (search.actor_run_id as string | null)
  ) {
    return NextResponse.json({ error: "run mismatch" }, { status: 409 });
  }

  if (status === "SUCCEEDED" && datasetId) {
    const result = await finalizeSucceeded({
      searchId: search.id as string,
      accountId: search.account_id as string,
      intent: search.intent as Intent,
      datasetId,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }

  if (
    status === "FAILED" ||
    status === "ABORTED" ||
    status === "TIMED-OUT" ||
    status === "TIMED_OUT"
  ) {
    const result = await finalizeFailed({
      searchId: search.id as string,
      accountId: search.account_id as string,
      creditsEstimated: (search.credits_estimated as number) ?? 0,
      creditsSpent: (search.credits_spent as number) ?? 0,
      reason: payload.resource?.statusMessage ?? `Actor ${status}`,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: true, ignored: payload.eventType });
}

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
