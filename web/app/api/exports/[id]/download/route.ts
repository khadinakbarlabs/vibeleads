/**
 * Stream the CSV file for an export. Verifies the caller is a member of
 * the export's account; uses a presigned URL from Supabase Storage.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { adminSupabase } from "@/lib/db/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { accountId } = await requireAccount();
  const supabase = await createServerSupabase();

  const { data: row, error } = await supabase
    .from("exports")
    .select("id, account_id, type, file_path, lead_count")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error || !row || row.type !== "csv" || !row.file_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Sign a short-lived URL (60s) and redirect.
  const { data: signed, error: signErr } = await adminSupabase()
    .storage.from("exports")
    .createSignedUrl(row.file_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
