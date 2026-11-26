/**
 * Social profile discovery.
 *
 * Fetches the lead's homepage and pulls the first link to each major social
 * platform from the HTML. Lightweight — we don't render JS, we just regex
 * for common social URL patterns.
 *
 * Network behavior: 8s timeout, follow redirects, abort on >1MB response.
 */
import "server-only";

export type SocialPlatform =
  | "linkedin"
  | "facebook"
  | "twitter"
  | "instagram"
  | "youtube"
  | "tiktok";

export type SocialMap = Partial<Record<SocialPlatform, string>>;

interface PatternEntry {
  platform: SocialPlatform;
  /** Hostname patterns that identify this platform. */
  hosts: RegExp;
  /**
   * Whitelist of valid URL path shapes. Helps filter share-buttons that
   * link to e.g. https://twitter.com/intent/tweet?...
   */
  pathOk: (pathname: string) => boolean;
}

const PATTERNS: PatternEntry[] = [
  {
    platform: "linkedin",
    hosts: /(^|\.)linkedin\.com$/i,
    pathOk: (p) => /^\/(company|in|school)\/[A-Za-z0-9._-]+/.test(p),
  },
  {
    platform: "facebook",
    hosts: /(^|\.)(facebook\.com|fb\.com)$/i,
    pathOk: (p) =>
      /^\/[A-Za-z0-9._-]+\/?$/.test(p) ||
      /^\/(pages|pg)\/[A-Za-z0-9._-]+/.test(p),
  },
  {
    platform: "twitter",
    hosts: /(^|\.)(twitter\.com|x\.com)$/i,
    pathOk: (p) =>
      /^\/[A-Za-z0-9_]{1,15}\/?$/.test(p) &&
      !p.startsWith("/intent") &&
      !p.startsWith("/share"),
  },
  {
    platform: "instagram",
    hosts: /(^|\.)instagram\.com$/i,
    pathOk: (p) => /^\/[A-Za-z0-9._-]+\/?$/.test(p),
  },
  {
    platform: "youtube",
    hosts: /(^|\.)youtube\.com$/i,
    pathOk: (p) =>
      p.startsWith("/@") ||
      p.startsWith("/c/") ||
      p.startsWith("/channel/") ||
      p.startsWith("/user/"),
  },
  {
    platform: "tiktok",
    hosts: /(^|\.)tiktok\.com$/i,
    pathOk: (p) => p.startsWith("/@"),
  },
];

const HREF_RE = /href\s*=\s*["']([^"'\s]+)["']/gi;

export async function discoverSocials(websiteUrl: string): Promise<SocialMap> {
  let normalized: URL;
  try {
    normalized = new URL(websiteUrl);
  } catch {
    return {};
  }
  if (normalized.protocol !== "https:" && normalized.protocol !== "http:") {
    return {};
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(normalized.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; VibeLeadsBot/1.0; +https://vibeleads.app/bot)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return {};
    const reader = res.body?.getReader();
    if (!reader) return {};

    const chunks: Uint8Array[] = [];
    let total = 0;
    const MAX_BYTES = 1024 * 1024; // 1MB cap
    while (total < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    reader.cancel().catch(() => {});
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.byteLength;
    }
    html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return {};
  }

  const found: SocialMap = {};
  for (const m of html.matchAll(HREF_RE)) {
    const href = m[1];
    let abs: URL;
    try {
      abs = new URL(href, normalized);
    } catch {
      continue;
    }
    for (const entry of PATTERNS) {
      if (found[entry.platform]) continue;
      if (!entry.hosts.test(abs.hostname)) continue;
      if (!entry.pathOk(abs.pathname)) continue;
      // Strip query / hash for cleaner storage
      const clean = `${abs.protocol}//${abs.hostname}${abs.pathname.replace(/\/$/, "")}`;
      found[entry.platform] = clean;
    }
    if (Object.keys(found).length === PATTERNS.length) break;
  }

  return found;
}
