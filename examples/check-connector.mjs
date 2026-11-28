// Discover the live gateway tools without executing an Actor.
import { readFile } from "node:fs/promises";

const config = JSON.parse(
  await readFile(new URL("../.mcp.json", import.meta.url), "utf8"),
);
const { url } = config.mcpServers.vibeleads;
if (url !== "https://mcp.apify.com/?tools=khadinakbar/vibeleads") {
  throw new Error("The connector must point to the VibeLeads Apify gateway.");
}
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error("Set APIFY_TOKEN to your own Apify API token.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};
async function send(method, params, id) {
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`${method} returned HTTP ${response.status}`);
  const session = response.headers.get("mcp-session-id");
  if (session) headers["mcp-session-id"] = session;
  if (id === undefined) {
    await response.body?.cancel();
    return;
  }
  const result = (message) => {
    if (message.id !== id || message.error || !message.result)
      throw new Error(`${method} did not return a successful matching reply`);
    return message.result;
  };
  if (response.headers.get("content-type")?.includes("application/json"))
    return result(await response.json());
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) throw new Error(`${method} ended without a reply`);
      buffer = (buffer + value).replaceAll("\r\n", "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event
          .split("\n")
          .filter((s) => s.startsWith("data:"))
          .map((s) => s.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const message = JSON.parse(data);
        if (message.id === id) return result(message);
      }
    }
  } finally {
    await reader.cancel();
  }
}

const init = await send(
  "initialize",
  {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "vibeleads-connector-check", version: "1.0.0" },
  },
  1,
);
headers["mcp-protocol-version"] = init.protocolVersion;
await send("notifications/initialized", {});
const tools = [];
const cursors = new Set();
let cursor;
let requestId = 2;
do {
  const page = await send("tools/list", cursor ? { cursor } : {}, requestId++);
  tools.push(...page.tools);
  cursor = page.nextCursor;
  if (cursor && cursors.has(cursor)) throw new Error("Gateway returned a repeated tools cursor.");
  if (cursor) cursors.add(cursor);
} while (cursor);

const actor = tools.find((tool) => tool.name.replace(/[^a-z]/g, "") === "khadinakbarvibeleads");
const actions = new Set(actor?.inputSchema?.properties?.tool?.enum ?? []);
const required = [
  ["buyer routing", actions.has("route_leads")],
  ["project storage and opportunity review", actions.has("seller_project")],
  ["B2B list readback", actions.has("lead_search_status")],
  ["local CSV readback", actions.has("export_leads")],
  ["dataset readback", tools.some((tool) => tool.name === "get-dataset-items")],
  ["structured output readback", tools.some((tool) => tool.name === "get-key-value-store-record")],
];
console.log(`${init.serverInfo.name} ${init.serverInfo.version} · MCP ${init.protocolVersion}`);
for (const [feature, available] of required) {
  console.log(`${available ? "Advertised" : "Missing"} — ${feature}`);
}
if (required.some(([, available]) => !available)) {
  console.error("Refresh or reconnect the VibeLeads MCP server and reselect it in your chat. If project tools remain unavailable, use the included search and keep results in this chat.");
  process.exitCode = 1;
}
