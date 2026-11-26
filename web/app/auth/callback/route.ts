/**
 * OAuth + Magic Link callback handler.
 *
 * Supabase redirects here with `?code=...` after the user clicks a magic link
 * or completes an OAuth flow. We exchange the code for a session, then
 * redirect to the `next` param (defaults to /dashboard).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // Disallow open-redirects: only allow same-origin paths.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
