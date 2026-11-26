import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  OAUTH_COOKIE,
  startApifyAuthorization,
} from "@/lib/workspace/auth";
import { workspaceOrigin } from "@/lib/workspace/config";

export async function GET(request: NextRequest) {
  const origin = workspaceOrigin();
  if (request.nextUrl.origin !== origin.origin) {
    return NextResponse.redirect(new URL("/auth/apify/start", origin));
  }
  try {
    const { url, value } = await startApifyAuthorization();
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(OAUTH_COOKIE, value, {
      ...cookieOptions,
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/connect?status=unavailable", origin),
    );
  }
}
