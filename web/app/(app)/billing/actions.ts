"use server";

import { z } from "zod";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth/server";
import { adminSupabase } from "@/lib/db/admin";
import { serverEnv } from "@/lib/env.server";
import { publicEnv } from "@/lib/env";
import { PLAN_TIERS } from "@/lib/billing/plans";

const PlanIdSchema = z.enum(["starter", "pro", "scale"]);
const CycleSchema = z.enum(["monthly", "annual"]);

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (_stripe) return _stripe;
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY on Vercel.");
  }
  _stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
  return _stripe;
}

interface StartCheckoutInput {
  plan: "starter" | "pro" | "scale";
  cycle: "monthly" | "annual";
}

export type StartCheckoutResult =
  | { ok: false; error: string }
  | { ok: true; url: string };

export async function startCheckout(
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  const planParse = PlanIdSchema.safeParse(input.plan);
  const cycleParse = CycleSchema.safeParse(input.cycle);
  if (!planParse.success || !cycleParse.success) {
    return { ok: false, error: "Invalid plan or cycle" };
  }
  const tier = PLAN_TIERS.find((t) => t.id === planParse.data);
  if (!tier) return { ok: false, error: "Unknown plan" };

  const priceId =
    cycleParse.data === "annual"
      ? tier.stripePriceAnnual
      : tier.stripePriceMonthly;
  if (!priceId) {
    return {
      ok: false,
      error:
        "Stripe price ID not configured for this plan. Add STRIPE_PRICE_* env vars after creating products in Stripe.",
    };
  }

  if (!serverEnv.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      error:
        "Billing is not yet enabled. Drop me your STRIPE_SECRET_KEY and price IDs and I'll wire it.",
    };
  }

  const { user, accountId } = await requireAccount();
  const sup = adminSupabase();

  const { data: sub } = await sup
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      metadata: { account_id: accountId },
    });
    customerId = customer.id;
    await sup
      .from("subscriptions")
      .upsert(
        { account_id: accountId, stripe_customer_id: customerId },
        { onConflict: "account_id" },
      );
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/billing?status=success`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/billing?status=cancel`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { account_id: accountId, plan: planParse.data },
    },
  });

  if (!session.url)
    return { ok: false, error: "Stripe didn't return a checkout URL" };
  return { ok: true, url: session.url };
}

export async function openCustomerPortal(): Promise<
  { ok: false; error: string } | never
> {
  const { accountId } = await requireAccount();
  const sup = adminSupabase();
  const { data: sub } = await sup
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!sub?.stripe_customer_id) {
    return { ok: false, error: "No Stripe customer yet. Pick a plan first." };
  }
  if (!serverEnv.STRIPE_SECRET_KEY) {
    return { ok: false, error: "Stripe not configured." };
  }
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/billing`,
  });
  redirect(session.url);
}
