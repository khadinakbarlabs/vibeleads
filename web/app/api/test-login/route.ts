/**
 * Dev-only bypass that sets a Supabase session from a service-role-signed
 * access/refresh token pair. Refuses to run in production. Used by the
 * E2E test harness so we can skip the magic-link round-trip.
 *
 * Usage:
 *   POST /api/_dev/login
 *   body: { access_token, refresh_token }
 *
 * Returns 200 + Set-Cookie on success, 403 in prod, 400 on bad input.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/db/server";
import { rejectProductionDevRoute } from "@/lib/api/dev-only";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const productionResponse = rejectProductionDevRoute();
  if (productionResponse) return productionResponse;

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = (await request.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const accessToken = body.access_token;
  const refreshToken = body.refresh_token;
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { ok: false, error: "Missing access_token or refresh_token" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Failed to set session" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.session.user.id, email: data.session.user.email },
  });
}
