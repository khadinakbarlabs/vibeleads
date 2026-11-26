import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Security headers live here (rather than in vercel.json) so they apply
 * universally — `pnpm start`, self-hosted Node, Docker, and Vercel all
 * get the same defaults. vercel.json was deleted entirely (the cron
 * schedule moved to .github/workflows/cron-sweep-runs.yml because
 * Vercel Hobby caps crons at once-daily).
 *
 * The headers below match the policy SECURITY.md documents:
 * - X-Content-Type-Options: nosniff (prevent MIME sniffing)
 * - X-Frame-Options: SAMEORIGIN (allow same-origin embed; deny third-
 *   party iframes — auth pages would otherwise be clickjacking targets)
 * - Referrer-Policy: strict-origin-when-cross-origin (don't leak path
 *   to third parties)
 * - Permissions-Policy: disables FLoC + camera/mic/geolocation site-wide
 * - Strict-Transport-Security: 2-year HSTS, preload-list eligible
 * - Content-Security-Policy-Report-Only: see CSP_REPORT_ONLY below
 */

/**
 * Content Security Policy — currently shipped in REPORT-ONLY mode.
 * Browsers report violations to the console (and to `report-to` if
 * we wire one) but DON'T block the offending resource.
 *
 * The plan: live with report-only for a few weeks, watch the console
 * during normal use of the app + the verify-suite, tighten directives
 * as we learn what's needed, then flip to enforced (`Content-Security-
 * Policy:` instead of `Content-Security-Policy-Report-Only:`).
 *
 * Current allowlist:
 * - default-src 'self'           — only same-origin by default
 * - script-src 'self' 'unsafe-inline' — Next 16 needs inline for
 *     hydration + the theme bootstrap (`<ThemeBootstrap>` injects an
 *     inline <script> to apply the saved theme before React hydrates;
 *     we'd need a nonce or a script hash to avoid 'unsafe-inline')
 * - style-src 'self' 'unsafe-inline' — Tailwind v4 + react-style attrs
 * - img-src 'self' data: blob: — favicons + OG ImageResponse PNGs
 * - font-src 'self' data: — Geist via next/font
 * - connect-src 'self' https://*.supabase.co wss://*.supabase.co —
 *     browser-side calls to /api/* (same-origin) + Supabase REST +
 *     Realtime WebSocket. Anthropic + Apify are server-side only.
 * - frame-ancestors 'self' — duplicates X-Frame-Options for browsers
 *     that prefer CSP
 * - form-action 'self' — forms only post to our origin
 * - base-uri 'self' — no <base> tag tampering
 * - object-src 'none' — no Flash / plugins
 * - upgrade-insecure-requests — silently rewrite http: → https:
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_REPORT_ONLY,
  },
];

const nextConfig: NextConfig = {
  // Don't advertise Next.js in the X-Powered-By header — small but
  // standard hardening.
  poweredByHeader: false,

  // Stricter dev-mode checks. No-op in production.
  reactStrictMode: true,

  async redirects() {
    return [
      { source: "/dashboard", destination: "/workspace", permanent: false },
      { source: "/login", destination: "/workspace", permanent: false },
      { source: "/demo", destination: "/#preview", permanent: false },
      {
        source: "/demo/outreach",
        destination: "/#workflows",
        permanent: false,
      },
      {
        source: "/why-vibeleads",
        destination: "/#workflows",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
