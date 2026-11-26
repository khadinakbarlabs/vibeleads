/**
 * Plan tiers for VibeLeads. Pricing derived from May 2026 competitor
 * benchmark research (Apollo Pro $99, Clay Launch $185, Smartlead
 * Unlimited Smart $174, Hunter Growth $149, ListKit Pro $97).
 *
 * Strategy: undercut the typical SMMA stack (Apollo + Clay + Instantly +
 * NeverBounce ≈ $400-700/mo) at the Pro tier with all-in-one pricing.
 * Monthly billing, no annual lock-in, credits roll over 1 cycle, failed
 * enrichments auto-refund.
 */
import type { Database } from "@/lib/db/types";

type SubscriptionPlan = Database["public"]["Enums"]["subscription_plan"];

export interface PlanTier {
  id: Exclude<SubscriptionPlan, "free">;
  label: string;
  tagline: string;
  monthlyUsd: number;
  annualUsd: number; // per month, billed yearly
  monthlyCredits: number;
  /** Credits roll over up to this multiplier of monthlyCredits. */
  rolloverCap: number;
  /** Hard caps. */
  maxLeadsPerSearch: number;
  maxSearchesPerMonth: number | null; // null = unlimited
  seats: number;
  features: string[];
  /** Stripe Price IDs. Empty until user pastes them. */
  stripePriceMonthly: string | null;
  stripePriceAnnual: string | null;
  /** Highlight as "most popular" on the pricing card. */
  highlight?: boolean;
}

export const FREE_TIER = {
  id: "free" as const,
  label: "Free",
  tagline: "Try contact-form outreach, free. ~1 credit per message.",
  monthlyUsd: 0,
  annualUsd: 0,
  monthlyCredits: 100,
  rolloverCap: 1,
  maxLeadsPerSearch: 25,
  maxSearchesPerMonth: 5,
  seats: 1,
  features: [
    "100 credits/mo (≈100 messages)",
    "Up to 25 sends per campaign",
    "AI-written outreach messages",
    "Contact-form delivery + receipts",
    "CSV export of campaign results",
  ],
  stripePriceMonthly: null,
  stripePriceAnnual: null,
};

export const PLAN_TIERS: PlanTier[] = [
  {
    id: "starter",
    label: "Starter",
    tagline: "Solo operators running outreach for one brand.",
    monthlyUsd: 49,
    annualUsd: 39,
    monthlyCredits: 2_500,
    rolloverCap: 2,
    maxLeadsPerSearch: 500,
    maxSearchesPerMonth: 50,
    seats: 1,
    features: [
      "2,500 credits/mo ≈ 2,500 messages (rolls over up to 2×)",
      "50 campaigns per month",
      "Up to 500 sends per campaign",
      "AI-written, per-business messages",
      "Submission receipts + screenshots",
      "CSV + webhook export",
      "Pay only for sends that land",
    ],
    stripePriceMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    stripePriceAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? null,
  },
  {
    id: "pro",
    label: "Pro",
    tagline:
      "Agencies running outreach across many clients. Replaces your cold-email stack.",
    monthlyUsd: 129,
    annualUsd: 99,
    monthlyCredits: 15_000,
    rolloverCap: 2,
    maxLeadsPerSearch: 2_500,
    maxSearchesPerMonth: null,
    seats: 3,
    features: [
      "15,000 credits/mo ≈ 15,000 messages (rolls over up to 2×)",
      "Unlimited campaigns",
      "Up to 2,500 sends per campaign",
      "AI-written, per-business messages",
      "Screenshot receipts for client reporting",
      "Export results to CSV, Sheets, or webhook",
      "Priority message generation",
      "3 seats",
    ],
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    stripePriceAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
    highlight: true,
  },
  {
    id: "scale",
    label: "Scale",
    tagline: "High-volume outreach agencies, 10+ clients, white-label.",
    monthlyUsd: 349,
    annualUsd: 289,
    monthlyCredits: 75_000,
    rolloverCap: 2,
    maxLeadsPerSearch: 10_000,
    maxSearchesPerMonth: null,
    seats: 10,
    features: [
      "75,000 credits/mo ≈ 75,000 messages (rolls over up to 2×)",
      "Unlimited campaigns",
      "Up to 10,000 sends per campaign",
      "Everything in Pro +",
      "White-label PDF receipts for clients",
      "Sub-workspaces (1 per client, 25 max)",
      "API access + webhooks",
      "Bulk export to all integrations",
      "Priority Slack support",
      "10 seats",
    ],
    stripePriceMonthly: process.env.STRIPE_PRICE_SCALE_MONTHLY ?? null,
    stripePriceAnnual: process.env.STRIPE_PRICE_SCALE_ANNUAL ?? null,
  },
];

export function getPlanTier(id: SubscriptionPlan): PlanTier | typeof FREE_TIER {
  if (id === "free") return FREE_TIER;
  const t = PLAN_TIERS.find((p) => p.id === id);
  if (!t) return FREE_TIER;
  return t;
}

/** Cross-tier rules. */
export const BILLING_RULES = {
  annualDiscountPercent: 17,
  rolloverCycles: 1, // unused credits roll over for N billing cycles
  overagePricePerCredit: 0.05, // USD per credit beyond monthly+rollover
  failedLookupAutoRefund: true,
  monthlyCancellable: true,
  pauseAllowedPerYear: 1, // 1 paused month per year
} as const;
