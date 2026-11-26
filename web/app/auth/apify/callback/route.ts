import { NextRequest, NextResponse } from "next/server";
import {
  ACCOUNT_COOKIE,
  cookieOptions,
  finishApifyAuthorization,
  OAUTH_COOKIE,
} from "@/lib/workspace/auth";
import { workspaceOrigin } from "@/lib/workspace/config";

export async function GET(request: NextRequest) {
  const origin = workspaceOrigin();
  let response: NextResponse;
  try {
    const { value, maxAge } = await finishApifyAuthorization(
      request.nextUrl.search,
      request.cookies.get(OAUTH_COOKIE)?.value,
    );
    response = NextResponse.redirect(new URL("/workspace", origin));
    response.cookies.set(ACCOUNT_COOKIE, value, { ...cookieOptions, maxAge });
  } catch {
    const status =
      request.nextUrl.searchParams.get("error") === "access_denied"
        ? "cancelled"
        : "failed";
    response = NextResponse.redirect(
      new URL(`/connect?status=${status}`, origin),
    );
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(OAUTH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
