/**
 * Authenticated proof download. Native submitter screenshots are stored in a
 * private bucket and are never rendered from a public object URL.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { adminSupabase } from "@/lib/db/admin";
import { parseOutreachProofReference } from "@/lib/outreach/proof-storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, account_id, raw")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const raw = (lead.raw ?? {}) as Record<string, unknown>;
  const ref = parseOutreachProofReference(
    typeof raw.screenshot_url === "string" ? raw.screenshot_url : null,
  );
  if (!ref || !ref.path.startsWith(`${accountId}/`)) {
    return NextResponse.json({ error: "proof unavailable" }, { status: 404 });
  }

  const { data: signed, error: signError } = await adminSupabase()
    .storage.from(ref.bucket)
    .createSignedUrl(ref.path, 60);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "proof unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl, 307);
}
