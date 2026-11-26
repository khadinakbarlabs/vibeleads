import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import * as oidc from "openid-client";
import { apifyAccount } from "./apify";
import { OAUTH_CALLBACK, oauthClientId, workspaceOrigin } from "./config";
import { openSession, sealSession } from "./session-codec";

const ISSUER = "https://console-backend.apify.com";
export const OAUTH_SCOPE = "openid profile full_api_access";
export const OAUTH_COOKIE = "__Host-vl-apify-oauth";
export const ACCOUNT_COOKIE = "__Host-vl-apify-account";
export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
} as const;

const transactionSchema = z.object({
  state: z.string().min(32),
  nonce: z.string().min(32),
  verifier: z.string().min(43),
  expiresAt: z.number().int().positive(),
});

const accountSchema = z.object({
  accessToken: z.string().min(1),
  accountId: z.string().min(1),
  username: z.string().min(1).max(100),
  expiresAt: z.number().int().positive(),
});

export type WorkspaceAccount = z.infer<typeof accountSchema>;

function sessionKey() {
  const value = process.env.APIFY_WORKSPACE_SESSION_KEY;
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error("Apify sign-in is not configured");
  }
  const key = Buffer.from(value, "base64url");
  if (key.length !== 32 || key.toString("base64url") !== value) {
    throw new Error("Invalid Apify session configuration");
  }
  return key;
}

function oidcConfig() {
  const config = new oidc.Configuration(
    {
      issuer: ISSUER,
      authorization_endpoint: "https://console.apify.com/authorize/oauth",
      token_endpoint: `${ISSUER}/oauth/apps/token`,
      jwks_uri: `${ISSUER}/oauth/jwks`,
      authorization_response_iss_parameter_supported: true,
      id_token_signing_alg_values_supported: ["RS256"],
      code_challenge_methods_supported: ["S256"],
    },
    oauthClientId(),
    {
      token_endpoint_auth_method: "none",
      id_token_signed_response_alg: "RS256",
    },
    oidc.None(),
  );
  config.timeout = 12;
  oidc.enableNonRepudiationChecks(config);
  return config;
}

function valid<T extends { expiresAt: number }>(
  schema: z.ZodType<T>,
  raw: unknown,
) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
  return parsed.data;
}

export async function startApifyAuthorization() {
  const key = sessionKey();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const verifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(verifier);
  const url = oidc.buildAuthorizationUrl(oidcConfig(), {
    redirect_uri: new URL(OAUTH_CALLBACK, workspaceOrigin()).href,
    scope: OAUTH_SCOPE,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  const value = sealSession(
    "oauth",
    { state, nonce, verifier, expiresAt: Date.now() + 600_000 },
    key,
  );
  return { url, value };
}

export async function finishApifyAuthorization(
  search: string,
  cookie: string | undefined,
) {
  const key = sessionKey();
  const transaction = valid(
    transactionSchema,
    openSession("oauth", cookie, key),
  );
  if (!transaction) throw new Error("Apify sign-in expired");

  const callback = new URL(OAUTH_CALLBACK, workspaceOrigin());
  callback.search = search;
  const tokens = await oidc.authorizationCodeGrant(oidcConfig(), callback, {
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    pkceCodeVerifier: transaction.verifier,
  });
  if (!tokens.claims()?.sub) throw new Error("Apify identity was not verified");
  const profile = await apifyAccount(tokens.access_token);
  const maxAge = Math.min(tokens.expiresIn() ?? 1800, 3600);
  if (maxAge < 1) throw new Error("Apify authorization expired");

  const value = sealSession(
    "account",
    {
      accessToken: tokens.access_token,
      accountId: profile.id,
      username: profile.username,
      expiresAt: Date.now() + maxAge * 1000,
    },
    key,
  );
  return { value, maxAge };
}

export async function workspaceAccount(): Promise<WorkspaceAccount | null> {
  const value = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!value) return null;
  try {
    return valid(accountSchema, openSession("account", value, sessionKey()));
  } catch {
    return null;
  }
}
