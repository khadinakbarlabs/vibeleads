/**
 * Refreshes the Supabase auth session on every request and forwards the
 * new cookies to the response. Required for Server Components that need
 * to read auth state.
 *
 * See https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

import { dashboardDestination } from "@/lib/workspace/config";
export async function proxy(request: NextRequest) {
  if (/^\/workspace(?:\/|$)/.test(request.nextUrl.pathname)) {
    const destination = dashboardDestination(new URL(request.url));
    return destination
      ? NextResponse.redirect(destination)
      : NextResponse.next();
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching getUser() refreshes the session if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/workspace/:path*",
    /*
     * Match all request paths except:
     * - _next/static, _next/image (asset optimization)
     * - favicon.ico, image assets (.svg/.png/.jpg/.jpeg/.gif/.webp/.avif)
     * - api/* — every API route uses its own auth (webhook signatures
     *   for /api/webhooks/*, CRON_SECRET for /api/cron/*, signed
     *   tokens for /api/exports/[id]/download, fully public for
     *   /api/capabilities/*, /api/mcp, /api/openapi.json). Running
     *   the Supabase session refresh on these routes is wasted work.
     *
     * The proxy DOES still run on /auth/callback (post-OAuth cookie
     * exchange), /auth/sign-out, and every page route — those need
     * the session refresh.
     */
    "/((?!$|_next/static|_next/image|favicon.ico|api/|auth/apify/|workspace(?:/|$)|connect(?:/|$)|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
