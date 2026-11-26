import { MCP_URL } from "./config";

export const BRIDGE = "mcp-remote@0.16.7";
export const localCommand = `npx --yes ${BRIDGE} "${MCP_URL}"`;
export const setupPrompt = `Help me connect VibeLeads to this assistant using ${MCP_URL}. If you support a remote MCP connector, use it and let me sign in to Apify in my browser. If this is a local desktop or terminal agent that supports stdio, configure npx with the arguments --yes, ${BRIDGE}, and that URL. Keep credentials out of this chat. Show the steps you cannot perform. Once connected, let me start with just my offer, such as “I am a video editor.” Use any buyer criteria I already gave you. Show the search plan and price before starting any paid work.`;
export const localConfig = (withKey: boolean) =>
  JSON.stringify(
    {
      mcpServers: {
        vibeleads: {
          command: "npx",
          args: [
            "--yes",
            BRIDGE,
            MCP_URL,
            ...(withKey
              ? ["--header", "Authorization: Bearer ${APIFY_TOKEN}"]
              : []),
          ],
        },
      },
    },
    null,
    2,
  );

export const skillsInstall =
  "claude plugin marketplace add khadinakbarlabs/vibeleads\nclaude plugin install vibeleads@vibeleads-local --scope user";
