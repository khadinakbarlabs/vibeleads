"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";

const LeadIdsSchema = z.array(z.string().uuid()).min(1).max(1000);

interface ListResult {
  id: string;
  name: string;
}

export async function saveLeadsToList(
  leadIds: string[],
  listId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ids = LeadIdsSchema.safeParse(leadIds);
  if (!ids.success) return { ok: false, error: "Invalid lead ids" };
  if (!z.string().uuid().safeParse(listId).success) {
    return { ok: false, error: "Invalid list id" };
  }

  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  // Verify list belongs to account (RLS would also reject — explicit guard).
  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!list) return { ok: false, error: "List not found" };

  const inserts = ids.data.map((lead_id) => ({ list_id: listId, lead_id }));
  const { error } = await supabase
    .from("list_leads")
    .upsert(inserts, { onConflict: "list_id,lead_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/lists/${listId}`);
  return { ok: true, count: ids.data.length };
}

export async function createListAndSave(
  name: string,
  leadIds: string[],
): Promise<
  { ok: true; list: ListResult; count: number } | { ok: false; error: string }
> {
  const ids = LeadIdsSchema.safeParse(leadIds);
  if (!ids.success) return { ok: false, error: "Invalid lead ids" };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name required" };

  const { user, accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { data: list, error: createErr } = await supabase
    .from("lists")
    .insert({ account_id: accountId, user_id: user.id, name: trimmed })
    .select("id, name")
    .single();
  if (createErr || !list) {
    return { ok: false, error: createErr?.message ?? "Failed to create list" };
  }

  const inserts = ids.data.map((lead_id) => ({ list_id: list.id, lead_id }));
  const { error: insertErr } = await supabase
    .from("list_leads")
    .insert(inserts);
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${list.id}`);
  return {
    ok: true,
    list: { id: list.id, name: list.name },
    count: ids.data.length,
  };
}

export async function deleteLeads(
  leadIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ids = LeadIdsSchema.safeParse(leadIds);
  if (!ids.success) return { ok: false, error: "Invalid lead ids" };

  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("leads")
    .delete()
    .in("id", ids.data)
    .eq("account_id", accountId);
  if (error) return { ok: false, error: error.message };

  return { ok: true, count: ids.data.length };
}
