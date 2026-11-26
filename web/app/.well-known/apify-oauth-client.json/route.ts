import {
  OAUTH_CALLBACK,
  OAUTH_CLIENT_METADATA,
  workspaceOrigin,
} from "@/lib/workspace/config";

export async function GET() {
  const origin = workspaceOrigin();
  return Response.json(
    {
      client_id: new URL(OAUTH_CLIENT_METADATA, origin).href,
      client_name: "VibeLeads",
      client_uri: origin.href,
      redirect_uris: [new URL(OAUTH_CALLBACK, origin).href],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
