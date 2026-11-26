import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAX_COOKIE_BYTES = 3_800;

export function sealSession(
  purpose: "oauth" | "account",
  value: object,
  key: Buffer,
): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`vibeleads:${purpose}:v1`));
  const payload = Buffer.concat([
    nonce,
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64url");

  if (payload.length > MAX_COOKIE_BYTES) {
    throw new Error("Apify session exceeds the cookie size limit");
  }
  return payload;
}

export function openSession(
  purpose: "oauth" | "account",
  value: string | undefined,
  key: Buffer,
): unknown {
  if (!value || value.length > MAX_COOKIE_BYTES) return null;
  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length < 29 || payload.toString("base64url") !== value)
      return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      payload.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(`vibeleads:${purpose}:v1`));
    decipher.setAuthTag(payload.subarray(-16));
    const clear = Buffer.concat([
      decipher.update(payload.subarray(12, -16)),
      decipher.final(),
    ]);
    return JSON.parse(clear.toString("utf8"));
  } catch {
    return null;
  }
}
