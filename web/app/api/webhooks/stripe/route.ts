/**
 * Stripe webhook handler.
 *
 * Handles: checkout.session.completed, invoice.paid, customer.subscription.*
 *
 * - On checkout completed: link customer↔account, set initial subscription state.
 * - On invoice.paid: grant the tier's monthlyCredits to the account (renewal).
 * - On subscription.updated: keep our subscriptions row in sync.
 * - On subscription.deleted: mark canceled (credits stay until period ends).
 *
 * Config:
 *   - STRIPE_SECRET_KEY: server-side
 *   - STRIPE_WEBHOOK_SECRET: signing secret from Stripe dashboard webhook
 */
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { adminSupabase } from "@/lib/db/admin";
import { grantCreditsAdmin } from "@/lib/billing/credits";
import { PLAN_TIERS } from "@/lib/billing/plans";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/lib/db/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

// Stripe webhook signature verification needs the raw body.
export const dynamic = "force-dynamic";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (_stripe) return _stripe;
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not set");
  }
  _stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
  return _stripe;
}

export async function POST(request: NextRequest) {
  if (!serverEnv.STRIPE_SECRET_KEY || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      sig,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `signature: ${err instanceof Error ? err.message : "invalid"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Ack other events without action
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook ${event.type}]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler_error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, type: event.type });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionAny = session as unknown as Record<string, unknown> & {
    metadata?: Record<string, string>;
    customer?: string | { id: string };
    subscription?: string | { id: string };
    subscription_details?: { metadata?: Record<string, string> };
  };
  const accountId =
    sessionAny.metadata?.account_id ??
    sessionAny.subscription_details?.metadata?.account_id;
  if (!accountId) {
    console.warn(
      "[stripe] checkout.session.completed missing account_id metadata",
    );
    return;
  }
  const customerId =
    typeof sessionAny.customer === "string"
      ? sessionAny.customer
      : sessionAny.customer?.id;
  if (!customerId) return;

  const subId =
    typeof sessionAny.subscription === "string"
      ? sessionAny.subscription
      : (sessionAny.subscription?.id ?? null);

  const sup = adminSupabase();
  await sup.from("subscriptions").upsert(
    {
      account_id: accountId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
    },
    { onConflict: "account_id" },
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Grant the period's credits. The `subscription` field exists on the
  // raw event payload but the SDK type for current API version omits it
  // — read via a cast to keep this resilient across versions.
  const invAny = invoice as unknown as {
    subscription?: string | { id?: string };
  };
  const subId =
    typeof invAny.subscription === "string"
      ? invAny.subscription
      : invAny.subscription?.id;
  if (!subId) return;

  const sub = await stripe().subscriptions.retrieve(subId);
  const accountId = sub.metadata?.account_id;
  const planMeta = sub.metadata?.plan;
  if (!accountId || !planMeta) return;

  const tier = PLAN_TIERS.find((t) => t.id === planMeta);
  if (!tier) return;

  const invMeta = invoice as unknown as {
    period_start?: number;
    period_end?: number;
  };
  await grantCreditsAdmin({
    accountId,
    amount: tier.monthlyCredits,
    reason: "subscription_grant",
    refKind: "invoice",
    metadata: {
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subId,
      plan: planMeta,
      period_start: invMeta.period_start ?? null,
      period_end: invMeta.period_end ?? null,
    },
  });
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const accountId = sub.metadata?.account_id;
  if (!accountId) return;

  const planMeta = sub.metadata?.plan as SubscriptionPlan | undefined;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Period boundaries moved per item in the Dahlia API. Read from the
  // first item, falling back to top-level for older API behavior.
  const subAny = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    items?: {
      data?: Array<{
        current_period_start?: number;
        current_period_end?: number;
      }>;
    };
  };
  const item = subAny.items?.data?.[0];
  const startTs = item?.current_period_start ?? subAny.current_period_start;
  const endTs = item?.current_period_end ?? subAny.current_period_end;

  const sup = adminSupabase();
  await sup.from("subscriptions").upsert(
    {
      account_id: accountId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: (planMeta as SubscriptionPlan) ?? "free",
      status: sub.status as SubscriptionStatus,
      current_period_start: startTs
        ? new Date(startTs * 1000).toISOString()
        : null,
      current_period_end: endTs ? new Date(endTs * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: "account_id" },
  );
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const accountId = sub.metadata?.account_id;
  if (!accountId) return;
  const sup = adminSupabase();
  await sup
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
    })
    .eq("account_id", accountId);
}
