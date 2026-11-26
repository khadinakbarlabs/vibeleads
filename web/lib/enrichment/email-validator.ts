/**
 * Email validation — provider-agnostic.
 *
 * Picks NeverBounce or ZeroBounce based on which API key is configured.
 * If neither is set, we fall back to syntax-only validation (which is
 * essentially "can RFC 5322 parse it") and mark every result `unknown`.
 *
 * Result mapping is deliberately conservative — anything that isn't
 * explicitly "valid" gets a non-`valid` status, so unknown providers
 * never lead to "trust these emails" UX.
 */
import "server-only";
import { serverEnv } from "@/lib/env.server";

export type EmailStatus = "valid" | "invalid" | "risky" | "unknown" | "skipped";

export interface EmailValidationResult {
  email: string;
  status: EmailStatus;
  /** Provider-specific raw status, kept for debugging / future tuning. */
  rawStatus?: string;
  /** Provider name that produced the result. Used for source transparency in the UI. */
  provider: "neverbounce" | "zerobounce" | "emaillistverify" | "syntax_only";
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailSyntax(email: string): boolean {
  return SIMPLE_EMAIL.test(email);
}

export async function validateEmail(
  email: string,
): Promise<EmailValidationResult> {
  const trimmed = email.trim();
  if (!validateEmailSyntax(trimmed)) {
    return {
      email: trimmed,
      status: "invalid",
      rawStatus: "syntax_failed",
      provider: "syntax_only",
    };
  }

  if (serverEnv.NEVERBOUNCE_API_KEY) {
    return validateWithNeverBounce(trimmed);
  }
  if (serverEnv.ZEROBOUNCE_API_KEY) {
    return validateWithZeroBounce(trimmed);
  }
  if (serverEnv.EMAILLISTVERIFY_API_KEY) {
    return validateWithEmailListVerify(trimmed);
  }
  return {
    email: trimmed,
    status: "unknown",
    rawStatus: "syntax_only",
    provider: "syntax_only",
  };
}

async function validateWithNeverBounce(
  email: string,
): Promise<EmailValidationResult> {
  const url = new URL("https://api.neverbounce.com/v4/single/check");
  url.searchParams.set("key", serverEnv.NEVERBOUNCE_API_KEY!);
  url.searchParams.set("email", email);
  url.searchParams.set("address_info", "0");
  url.searchParams.set("credits_info", "0");
  url.searchParams.set("timeout", "10");

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return {
        email,
        status: "unknown",
        rawStatus: `http_${res.status}`,
        provider: "neverbounce",
      };
    }
    const body = (await res.json()) as { status?: string; result?: string };
    const raw = body.result ?? body.status ?? "unknown";
    const status =
      raw === "valid"
        ? "valid"
        : raw === "invalid"
          ? "invalid"
          : raw === "catchall" || raw === "disposable"
            ? "risky"
            : "unknown";
    return { email, status, rawStatus: raw, provider: "neverbounce" };
  } catch {
    return {
      email,
      status: "unknown",
      rawStatus: "network_error",
      provider: "neverbounce",
    };
  }
}

async function validateWithEmailListVerify(
  email: string,
): Promise<EmailValidationResult> {
  // EmailListVerify single-check — returns plain text status.
  const url = new URL("https://apps.emaillistverify.com/api/verifyEmail");
  url.searchParams.set("secret", serverEnv.EMAILLISTVERIFY_API_KEY!);
  url.searchParams.set("email", email);

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return {
        email,
        status: "unknown",
        rawStatus: `http_${res.status}`,
        provider: "emaillistverify",
      };
    }
    const raw = (await res.text()).trim().toLowerCase();
    // EmailListVerify returns plain-text status. Full enum (verified
    // against the live API in May 2026):
    //   ok                        → mailbox confirmed deliverable
    //   ok_for_all                → catch-all domain (treat as risky)
    //   accept_all                → catch-all domain (treat as risky)
    //   disposable                → throwaway provider (treat as risky)
    //   error                     → SMTP rejected (invalid)
    //   invalid_mx                → no MX record (invalid)
    //   smtp_protocol/error       → SMTP misbehaved (invalid)
    //   dead_server               → server unreachable (invalid)
    //   email_disabled            → mailbox disabled (invalid)
    //   disabled_account          → mailbox disabled (invalid)
    //   unknown_email             → not found (invalid)
    //   antispam_system           → upstream blocked us (unknown — retry-worthy)
    //   relay_error               → temporary upstream issue (unknown)
    //   unknown                   → couldn't determine (unknown)
    const status =
      raw === "ok"
        ? "valid"
        : raw === "ok_for_all" || raw === "accept_all" || raw === "disposable"
          ? "risky"
          : raw === "error" ||
              raw === "invalid_mx" ||
              raw === "smtp_protocol" ||
              raw === "smtp_error" ||
              raw === "dead_server" ||
              raw === "email_disabled" ||
              raw === "disabled_account" ||
              raw === "unknown_email"
            ? "invalid"
            : "unknown";
    return { email, status, rawStatus: raw, provider: "emaillistverify" };
  } catch {
    return {
      email,
      status: "unknown",
      rawStatus: "network_error",
      provider: "emaillistverify",
    };
  }
}

async function validateWithZeroBounce(
  email: string,
): Promise<EmailValidationResult> {
  const url = new URL("https://api.zerobounce.net/v2/validate");
  url.searchParams.set("api_key", serverEnv.ZEROBOUNCE_API_KEY!);
  url.searchParams.set("email", email);

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return {
        email,
        status: "unknown",
        rawStatus: `http_${res.status}`,
        provider: "zerobounce",
      };
    }
    const body = (await res.json()) as { status?: string; sub_status?: string };
    const raw = body.status ?? "unknown";
    const status =
      raw === "valid"
        ? "valid"
        : raw === "invalid"
          ? "invalid"
          : raw === "catch-all" ||
              raw === "spamtrap" ||
              raw === "abuse" ||
              raw === "do_not_mail"
            ? "risky"
            : "unknown";
    return { email, status, rawStatus: raw, provider: "zerobounce" };
  } catch {
    return {
      email,
      status: "unknown",
      rawStatus: "network_error",
      provider: "zerobounce",
    };
  }
}

/**
 * Validate a list of emails for one lead. Aggregates to a single status:
 *   - "valid" if any email is valid
 *   - "invalid" if all are invalid
 *   - "risky" / "unknown" otherwise
 *
 * Returns the per-email results so the UI can show provenance later.
 */
export async function validateLeadEmails(
  emails: string[],
): Promise<{ aggregate: EmailStatus; results: EmailValidationResult[] }> {
  if (emails.length === 0) {
    return { aggregate: "skipped", results: [] };
  }

  const results = await Promise.all(emails.map((e) => validateEmail(e)));
  const has = (s: EmailStatus) => results.some((r) => r.status === s);

  const aggregate: EmailStatus = has("valid")
    ? "valid"
    : has("risky")
      ? "risky"
      : has("unknown")
        ? "unknown"
        : "invalid";

  return { aggregate, results };
}
