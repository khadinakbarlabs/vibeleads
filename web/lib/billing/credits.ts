/**
 * Credit ledger operations. All spends go through `spendCredits`, which
 * routes to a Postgres function that:
 *   1. Verifies the caller is a member of the target account.
 *   2. Takes a per-account advisory lock to serialize concurrent spends.
 *   3. Checks balance and inserts a negative delta atomically.
 *
 * Grants (signup, subscription renewal) go through `grantCreditsAdmin`,
 * which uses the service role and is restricted to webhooks/cron/system.
 */
import "server-only";
import { createServerSupabase } from "@/lib/db/server";
import { adminSupabase } from "@/lib/db/admin";

export type LedgerReason =
  | "signup_grant"
  | "subscription_grant"
  | "topup"
  | "search_run"
  | "lead_normalize"
  | "email_validate"
  | "phone_normalize"
  | "social_discovery"
  | "export_instantly"
  | "export_webhook"
  | "export_csv"
  | "refund"
  | "manual_adjustment";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly need: number,
  ) {
    super(`insufficient_credits: account=${accountId} need=${need}`);
    this.name = "InsufficientCreditsError";
  }
}

export interface SpendOptions {
  accountId: string;
  amount: number;
  reason: LedgerReason;
  refKind?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
}

export interface GrantOptions extends Omit<SpendOptions, "amount"> {
  amount: number;
}

export async function getBalance(accountId: string): Promise<number> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("account_credit_balance")
    .select("balance")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.balance ?? 0);
}

export class DailyCapExceededError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly spentToday: number,
    public readonly cap: number,
    public readonly attempted: number,
  ) {
    super(
      `daily_cap_exceeded: account=${accountId} spent_today=${spentToday} cap=${cap} attempted=${attempted}`,
    );
    this.name = "DailyCapExceededError";
  }
}

/**
 * Snapshot of today's spend + effective cap for an account.
 *
 * `cap` resolves in this order:
 *   1. `accounts.daily_credit_cap` (per-account override) when set
 *   2. `DEFAULT_DAILY_CREDIT_CAP` env (server default)
 *
 * Returns `cap = Infinity` when neither is set — disables the guard.
 */
export interface DailySpendSnapshot {
  spent: number;
  cap: number;
  remaining: number;
  warnAt: number | null;
  isOverWarn: boolean;
  isOverCap: boolean;
}

export async function getDailySpend(
  accountId: string,
): Promise<DailySpendSnapshot> {
  const { serverEnv } = await import("@/lib/env.server");
  const supabase = await createServerSupabase();

  const [spendRes, accountRes] = await Promise.all([
    supabase
      .from("account_today_spend")
      .select("credits_spent_today")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("daily_credit_cap, daily_credit_cap_warn_at")
      .eq("id", accountId)
      .maybeSingle(),
  ]);

  const spent = Number(spendRes.data?.credits_spent_today ?? 0);
  const accountCap = accountRes.data?.daily_credit_cap as number | null;
  const warnAt =
    (accountRes.data?.daily_credit_cap_warn_at as number | null) ?? null;
  const cap = accountCap ?? serverEnv.DEFAULT_DAILY_CREDIT_CAP;
  const remaining = Math.max(cap - spent, 0);
  return {
    spent,
    cap,
    remaining,
    warnAt,
    isOverWarn: warnAt != null && spent >= warnAt,
    isOverCap: spent >= cap,
  };
}

/**
 * Throw `DailyCapExceededError` if spending `attempted` more credits
 * today would exceed the account's daily cap. Used by `createSearch`
 * to refuse a run BEFORE the actor starts (and before any Apify
 * spend is committed).
 *
 * Idempotent and read-only — never inserts into the ledger.
 */
export async function assertDailyCap(
  accountId: string,
  attempted: number,
): Promise<void> {
  const snap = await getDailySpend(accountId);
  if (snap.spent + attempted > snap.cap) {
    throw new DailyCapExceededError(accountId, snap.spent, snap.cap, attempted);
  }
}

/** Authenticated-user spend. Throws InsufficientCreditsError if balance too low. */
export async function spendCredits(opts: SpendOptions): Promise<number> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("spend_credits", {
    p_account_id: opts.accountId,
    p_amount: opts.amount,
    p_reason: opts.reason,
    p_ref_kind: opts.refKind ?? undefined,
    p_ref_id: opts.refId ?? undefined,
    p_metadata: (opts.metadata ?? undefined) as never,
  });

  if (error) {
    // PostgrestError exposes `code` (Postgres SQLSTATE).
    if (error.code === "P0002" || /insufficient_credits/i.test(error.message)) {
      throw new InsufficientCreditsError(opts.accountId, opts.amount);
    }
    throw error;
  }

  return Number(data);
}

/**
 * System-only grant. Used in webhooks and cron jobs (e.g. subscription
 * renewal, refund on actor failure). Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function grantCreditsAdmin(opts: GrantOptions): Promise<number> {
  const supabase = adminSupabase();
  const { data, error } = await supabase.rpc("grant_credits_admin", {
    p_account_id: opts.accountId,
    p_amount: opts.amount,
    p_reason: opts.reason,
    p_ref_kind: opts.refKind ?? undefined,
    p_ref_id: opts.refId ?? undefined,
    p_metadata: (opts.metadata ?? undefined) as never,
  });
  if (error) throw error;
  return Number(data);
}

/**
 * Estimate credits required for a search before running. Used preflight.
 *
 * Routes through the leaf-task registry + strategy recipe builder so the
 * estimate matches what we actually charge, with margin protection
 * baked in at the task level. See lib/tasks/registry.ts and
 * lib/tasks/credit-calc.ts for the math.
 *
 * The legacy `costPer100` arg is ignored — preserved in the type so the
 * old call sites don't break, but the credit weight comes from the
 * registry now.
 */
import {
  buildRecipe,
  costRecipe,
  type RecipeCost,
} from "@/lib/tasks/credit-calc";
import { decide } from "@/lib/strategies/decide";
import type { ParsedFilters } from "@/lib/strategies/types";

export interface EstimateSearchCreditsOpts {
  /** Routed intent (local_business / gmaps_leads / hiring_intent / etc). */
  intent: string;
  maxResults: number;
  enrichEmail: boolean;
  enrichSocials: boolean;
  /** Optional — when set, includes pagespeed enrichment in the estimate. */
  enrichPagespeed?: boolean;
  /** Optional — for contact_form_submit when takeScreenshots is on. */
  takeScreenshots?: boolean;
  /** Legacy field, ignored. */
  costPer100?: number;
}

/**
 * Default-recipe estimate — used when we don't have ParsedFilters yet
 * (e.g. before the AI router has run). Routes through the calculator's
 * built-in recipe per intent.
 */
export function estimateSearchCredits(opts: EstimateSearchCreditsOpts): number {
  const recipe = buildRecipe({
    intent: opts.intent,
    maxResults: opts.maxResults,
    enrichEmail: opts.enrichEmail,
    enrichSocials: opts.enrichSocials,
    enrichPagespeed: opts.enrichPagespeed,
    takeScreenshots: opts.takeScreenshots,
  });
  return costRecipe(recipe).totalCredits;
}

/**
 * Strategy-aware estimate — preferred whenever ParsedFilters are
 * available. Routes through `decide()` so the recipe matches the
 * matched strategy's `buildRecipe`, including oversampling when filters
 * are restrictive (no_website, slow_website, independent_only, etc).
 *
 * Multipliers apply on top of the base strategy cost:
 *
 * - `locationsCount` multiplies the base by the number of cities. The
 *   native lane fans out one SerpAPI call per city, so a 3-city run is
 *   linearly more expensive than a single-city one. Defaults to 1.
 * - `validateEmails` adds ~0.5 credits per requested lead for the
 *   post-run email-validator pass (NeverBounce/ZeroBounce/EmailListVerify).
 *
 * Returns the full RecipeCost so callers can also expose a breakdown
 * without recomputing.
 */
export function estimateFromFilters(
  filters: ParsedFilters,
  multipliers: {
    locationsCount?: number;
    validateEmails?: boolean;
  } = {},
): {
  credits: number;
  cost: RecipeCost;
  strategyId: string;
} {
  const decision = decide(filters);
  const locationsCount = Math.max(1, multipliers.locationsCount ?? 1);
  const validationCredits = multipliers.validateEmails
    ? Math.round((filters.limit ?? 50) * 0.5)
    : 0;
  const base = decision.cost.totalCredits;
  const credits = base * locationsCount + validationCredits;
  return {
    credits,
    cost: decision.cost,
    strategyId: decision.strategy.id,
  };
}
