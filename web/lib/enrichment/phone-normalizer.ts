/**
 * Phone normalization. Sync, free, no API calls.
 *
 * Returns each input phone as E.164 (e.g. +17185551234) where possible,
 * along with a status flag. Non-parseable numbers are dropped.
 */
import "server-only";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export interface NormalizedPhone {
  raw: string;
  e164: string | null;
  type: "mobile" | "fixed_line" | "voip" | "unknown";
  status: "valid" | "invalid" | "unknown";
  country: string | null;
}

export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = "US",
): NormalizedPhone {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      raw,
      e164: null,
      type: "unknown",
      status: "invalid",
      country: null,
    };
  }
  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed || !parsed.isValid()) {
      return {
        raw,
        e164: null,
        type: "unknown",
        status: "invalid",
        country: null,
      };
    }
    const t = parsed.getType();
    const type: NormalizedPhone["type"] =
      t === "MOBILE" || t === "FIXED_LINE_OR_MOBILE"
        ? "mobile"
        : t === "FIXED_LINE"
          ? "fixed_line"
          : t === "VOIP"
            ? "voip"
            : "unknown";
    return {
      raw,
      e164: parsed.format("E.164"),
      type,
      status: "valid",
      country: parsed.country ?? null,
    };
  } catch {
    return {
      raw,
      e164: null,
      type: "unknown",
      status: "invalid",
      country: null,
    };
  }
}

export interface PhoneNormalizationSummary {
  /** Original input array. */
  input: string[];
  /** Successfully-parsed E.164 strings, deduplicated. */
  e164: string[];
  /** Per-input result rows. */
  results: NormalizedPhone[];
  /** Aggregate status — "valid" if any phone parsed; "invalid" if none did; "unknown" if input was empty. */
  status: "valid" | "invalid" | "unknown";
}

export function normalizePhones(
  phones: string[],
  defaultCountry: CountryCode = "US",
): PhoneNormalizationSummary {
  if (phones.length === 0) {
    return { input: phones, e164: [], results: [], status: "unknown" };
  }
  const results = phones.map((p) => normalizePhone(p, defaultCountry));
  const e164 = Array.from(
    new Set(results.map((r) => r.e164).filter((v): v is string => Boolean(v))),
  );
  const status: PhoneNormalizationSummary["status"] =
    e164.length > 0 ? "valid" : "invalid";
  return { input: phones, e164, results, status };
}
