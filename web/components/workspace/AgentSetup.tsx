"use client";
import { useState } from "react";
import { CopyText } from "./CopyText";
import { MCP_URL } from "@/lib/workspace/config";
const agents = {
  Claude: {
    step: "Open Settings → Connectors and choose Add custom connector. Name it VibeLeads and paste the server URL.",
    help: "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp",
  },
  ChatGPT: {
    step: "Open your workspace’s custom app or plugin setup. If your plan and admin allow developer mode, create an app named VibeLeads with the server URL and OAuth.",
    help: "https://developers.openai.com/api/docs/guides/custom-mcp-server",
  },
  "Claude Code": {
    step: "Run this command in your terminal. Then open /mcp in Claude Code, select vibeleads and authenticate.",
    help: "https://code.claude.com/docs/en/mcp",
  },
  Codex: {
    step: "Run the setup command in your terminal. If sign-in does not open, run codex mcp login vibeleads.",
    help: "https://developers.openai.com/codex/mcp/",
  },
  "Other agents": {
    step: "In the agent’s MCP settings, add a remote HTTP server named VibeLeads. Paste the server URL and select OAuth.",
    help: "https://docs.apify.com/mcp",
  },
};
export function AgentSetup() {
  const [agent, select] = useState<keyof typeof agents>("Claude");
  const value =
    agent === "Claude Code"
      ? 'claude mcp add --transport http vibeleads "' + MCP_URL + '"'
      : agent === "Codex"
        ? 'codex mcp add vibeleads --url "' + MCP_URL + '"'
        : MCP_URL;
  return (
    <section className="rd-card rd-setup">
      <h2>Choose your AI agent</h2>
      <div className="rd-tabs" aria-label="AI agents">
        {(Object.keys(agents) as (keyof typeof agents)[]).map((a) => (
          <button key={a} aria-pressed={agent === a} onClick={() => select(a)}>
            {a}
          </button>
        ))}
      </div>
      <ol className="rd-steps">
        <li>
          <h3>
            Add VibeLeads to {agent === "Other agents" ? "your agent" : agent}
          </h3>
          <p>{agents[agent].step}</p>
          <pre tabIndex={0}>{value}</pre>
          <CopyText
            key={agent}
            value={value}
            label={value !== MCP_URL ? "Copy setup command" : "Copy server URL"}
          />
        </li>
        <li>
          <h3>Authorize with Apify</h3>
          <p>
            Follow the sign-in window and approve access. When your agent lists
            VibeLeads as connected, it is ready to use.
          </p>
        </li>
        <li>
          <h3>Open your results</h3>
          <p>
            Sign in to the dashboard with the same Apify account to see your
            workflows and their results.
          </p>
        </li>
      </ol>
      <a className="vl-text-link" href={agents[agent].help}>
        Setup documentation ↗
      </a>
    </section>
  );
}
