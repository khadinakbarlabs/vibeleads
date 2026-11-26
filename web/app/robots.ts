/**
 * Public robots.txt — tells crawlers where the sitemap lives and which
 * paths to skip. Next 16 serves this at /robots.txt automatically.
 *
 * Disallow rules cover:
 *  - /api/*           — JSON endpoints don't need indexing
 *  - /auth/*          — OAuth callback / sign-out redirects
 *  - /dashboard, /search, /lists, /exports, /integrations, /billing,
 *    /settings — authenticated routes (would just hit the login wall)
 *
 * Public-content paths (/, /login, /capabilities/*, /demo/*) stay
 * indexable. Capability pages especially are rich landing points for
 * "lead generation API" or "google maps scraper alternative" kinds of
 * queries.
 */
import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/search",
          "/search/",
          "/lists",
          "/lists/",
          "/exports",
          "/exports/",
          "/integrations",
          "/integrations/",
          "/billing",
          "/billing/",
          "/settings",
          "/settings/",
          "/outreach",
          "/outreach/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
