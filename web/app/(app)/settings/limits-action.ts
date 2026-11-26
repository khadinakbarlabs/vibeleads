"use server";

/**
 * Update the daily-credit-cap settings for the caller's account.
 *
 * Both fields are nullable:
 *   - `daily_credit_cap = null`           → fall back to platform default
 *   - `daily_credit_cap_warn_at = null`   → no warn banner before the cap
 *
 * Validation is shallow but defensive: caps are non-negative integers,
 * the warn threshold can't exceed the hard cap when both are set.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";

const FormSchema = z
  .object({
    dailyCreditCap: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? null : v),
        z.coerce.number().int().min(0).nullable(),
      )
      .optional(),
    warnAt: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? null : v),
        z.coerce.number().int().min(0).nullable(),
      )
      .optional(),
  })
  .refine(
    (v) =>
      v.dailyCreditCap == null ||
      v.warnAt == null ||
      v.warnAt <= v.dailyCreditCap,
    {
      message: "Warn threshold must be ≤ daily cap.",
      path: ["warnAt"],
    },
  );

export interface UpdateLimitsResult {
  ok: boolean;
  error?: string;
}

export async function updateDailyLimits(
  _prev: UpdateLimitsResult | null,
  formData: FormData,
): Promise<UpdateLimitsResult> {
  const parsed = FormSchema.safeParse({
    dailyCreditCap: formData.get("dailyCreditCap"),
    warnAt: formData.get("warnAt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid limit values",
    };
  }

  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("accounts")
    .update({
      daily_credit_cap: parsed.data.dailyCreditCap ?? null,
      daily_credit_cap_warn_at: parsed.data.warnAt ?? null,
    })
    .eq("id", accountId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
