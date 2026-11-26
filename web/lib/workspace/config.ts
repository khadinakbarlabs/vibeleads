export const ACTOR_ID = "QQULln594LjlTtgyK";
export const ACTOR_URL = "https://apify.com/khadinakbar/vibeleads";
export const MCP_URL = "https://mcp.apify.com/?tools=khadinakbar/vibeleads";
export const OAUTH_CALLBACK = "/auth/apify/callback";
export const OAUTH_CLIENT_METADATA = "/.well-known/apify-oauth-client.json";

export function workspaceOrigin(): URL {
  const origin = new URL(
    process.env.APIFY_OAUTH_ORIGIN || "https://vibeleads-ten.vercel.app",
  );
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("Invalid Apify OAuth origin");
  }
  return origin;
}

export function oauthClientId(): string {
  return (
    process.env.APIFY_OAUTH_CLIENT_ID ||
    new URL(OAUTH_CLIENT_METADATA, workspaceOrigin()).href
  );
}
