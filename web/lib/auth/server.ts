/**
 * Server-side auth helpers. Always use these instead of reaching into the
 * Supabase client directly from routes — they centralize the
 * "redirect to /login on no session" rule.
 *
 * All three helpers are wrapped in React's `cache()` so calling them from
 * multiple Server Components inside the same render tree only hits
 * `/auth/v1/user` and `/rest/v1/account_members` ONCE per request — not
 * once per component. Without this, a page with a layout + 3 nested
 * Server Components calling `requireAccount()` produces 3 user fetches +
 * 3 account_members fetches. Production logs were showing 20+ duplicate
 * `/auth/v1/user` calls per page-load before this wrapper landed.
 *
 * `cache()` keys by argument identity AND React's per-request cache scope,
 * so it's safe to reuse — different requests get fresh data.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Resolves the current account for the signed-in user. For v1 every user has
 * exactly one personal account auto-provisioned at signup. Future team
 * support: take an accountId param and check membership.
 */
export const requireAccount = cache(async () => {
  const user = await requireUser();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("account_members")
    .select("account_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    // First sign-in race: trigger should have created the account, but if
    // we beat it, surface a soft retry instead of a 500.
    throw new Error("Account not yet provisioned. Refresh in a moment.");
  }

  return { user, accountId: data.account_id, role: data.role as string };
});
