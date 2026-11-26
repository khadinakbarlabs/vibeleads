/**
 * AES-256-GCM encrypt/decrypt for integration credentials. Output format:
 *   base64( IV(12) || ciphertext )
 *
 * If ENCRYPTION_KEY is not set, encryption is a no-op (prefixes plaintext
 * with `plain:` so downstream code can detect it). Keeps dev fast; prod
 * MUST set the key.
 */
import "server-only";
import { serverEnv } from "@/lib/env.server";

const PLAINTEXT_PREFIX = "plain:";

let _keyPromise: Promise<CryptoKey> | null = null;

function loadKey(): Promise<CryptoKey> {
  if (_keyPromise) return _keyPromise;
  if (!serverEnv.ENCRYPTION_KEY) {
    return Promise.reject(new Error("ENCRYPTION_KEY missing"));
  }
  const bytes = Buffer.from(serverEnv.ENCRYPTION_KEY, "hex");
  if (bytes.length !== 32) {
    return Promise.reject(new Error("ENCRYPTION_KEY must be 32 bytes"));
  }
  _keyPromise = crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return _keyPromise;
}

export async function sealSecret(plaintext: string): Promise<string> {
  if (!serverEnv.ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY must be set in production to store credentials",
      );
    }
    console.warn(
      "[secret-box] ENCRYPTION_KEY not set — storing credentials in plaintext (dev only)",
    );
    return PLAINTEXT_PREFIX + plaintext;
  }
  const key = await loadKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return Buffer.from(combined).toString("base64");
}

export async function openSecret(sealed: string): Promise<string> {
  if (sealed.startsWith(PLAINTEXT_PREFIX)) {
    return sealed.slice(PLAINTEXT_PREFIX.length);
  }
  const key = await loadKey();
  const combined = Buffer.from(sealed, "base64");
  const iv = combined.subarray(0, 12);
  const cipher = combined.subarray(12);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(buf);
}
