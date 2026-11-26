import "server-only";
import { cache } from "react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import type { Tables, TablesInsert } from "@/lib/db/types";

/**
 * Reusable sender / business profile.
 *
 * One row per account (see migration 0018). Entered once, then auto-
 * prefilled into every campaign so users never re-type their identity.
 * Also the source for filling each contact form's sender fields.
 */
export type BusinessProfile = Tables<"business_profiles">;

/**
 * The current account's profile, or null if not set up yet.
 * Wrapped in React `cache` so multiple callers in one request (the
 * wizard wrapper + settings page) share a single query.
 */
export const getBusinessProfile = cache(
  async (): Promise<BusinessProfile | null> => {
    const { accountId } = await requireAccount();
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();
    return (data as BusinessProfile | null) ?? null;
  },
);

export interface BusinessProfileInput {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  company: string;
  website: string;
  linkedin?: string | null;
  defaultPitch?: string | null;
}

/**
 * Create or update the account's profile. Upserts on account_id so a
 * campaign launch can keep the profile fresh without a separate "exists?"
 * check. Throws on failure so callers surface a clear error.
 */
export async function upsertBusinessProfile(
  input: BusinessProfileInput,
): Promise<void> {
  const { user, accountId } = await requireAccount();
  const supabase = await createServerSupabase();
  const row: TablesInsert<"business_profiles"> = {
    account_id: accountId,
    user_id: user.id,
    sender_name: input.senderName,
    sender_email: input.senderEmail,
    sender_phone: input.senderPhone,
    company: input.company,
    website: input.website,
    linkedin: input.linkedin ?? null,
    default_pitch: input.defaultPitch ?? null,
  };
  const { error } = await supabase
    .from("business_profiles")
    .upsert(row, { onConflict: "account_id" });
  if (error) {
    throw new Error(`Failed to save business profile: ${error.message}`);
  }
}
