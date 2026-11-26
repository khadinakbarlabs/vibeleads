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
const { tools } = await send("tools/list", {}, 2);
if (!tools.some((t) => /vibeleads/i.test(t.name)))
  throw new Error("VibeLeads is missing from the gateway.");
console.log(
  `${init.serverInfo.name} ${init.serverInfo.version} · MCP ${init.protocolVersion}`,
);
console.log(tools.map((t) => t.name).join("\n"));
