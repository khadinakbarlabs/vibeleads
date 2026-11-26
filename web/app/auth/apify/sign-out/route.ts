import { NextRequest, NextResponse } from "next/server";
import {
  ACCOUNT_COOKIE,
  cookieOptions,
  OAUTH_COOKIE,
} from "@/lib/workspace/auth";
import { workspaceOrigin } from "@/lib/workspace/config";

export async function POST(request: NextRequest) {
  const origin = workspaceOrigin();
  if (request.headers.get("origin") !== origin.origin) {
    return new Response("Forbidden", { status: 403 });
  }
  const response = NextResponse.redirect(origin, 303);
  response.headers.set("Cache-Control", "no-store");
  for (const cookie of [ACCOUNT_COOKIE, OAUTH_COOKIE]) {
    response.cookies.set(cookie, "", { ...cookieOptions, maxAge: 0 });
  }
  return response;
}
