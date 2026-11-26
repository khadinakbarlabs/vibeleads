"use client";
import { useState } from "react";
import { Terminal, Plug, Copy } from "lucide-react";
import { CopyText } from "./CopyText";
import { MCP_URL } from "@/lib/workspace/config";
import { localCommand, localConfig, setupPrompt } from "@/lib/workspace/setup";

const clients = {
  ChatGPT: {
    text: "Open Plugins, select +, then Add custom MCP server. Enter the URL, choose OAuth and create the connection. Workspace policies can restrict custom servers.",
    href: "https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt",
  },
  Claude: {
    text: "In Settings → Connectors, choose Add custom connector. Name it VibeLeads and paste the URL. Connect and authorize Apify in your browser.",
    href: "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp",
  },
  Other: {
    text: "Add an HTTP MCP server named VibeLeads in your assistant’s connector settings. Paste the URL, select OAuth, and authorize with Apify.",
    href: "https://docs.apify.com/platform/integrations/mcp",
  },
};
function Snippet({ value, label }: { value: string; label: string }) {
  return (
    <>
      <pre tabIndex={0} className="setup-snippet">
        {value}
      </pre>
      <CopyText value={value} label={label} />
    </>
  );
}
export function AgentSetup() {
  const [agent, select] = useState<keyof typeof clients>("ChatGPT"),
    [token, setToken] = useState(false);
  return (
    <div className="setup-grid">
      <section className="rd-card setup-card">
        <Plug aria-hidden size={23} />
        <h2>Connect your assistant</h2>
        <p>
          Use the hosted connector with an assistant that supports remote MCP.
        </p>
        <div className="rd-tabs" aria-label="Choose your assistant">
          {(Object.keys(clients) as (keyof typeof clients)[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === agent}
              onClick={() => select(c)}
            >
              {c === "Other" ? "Other clients" : c}
            </button>
          ))}
        </div>
        <p>{clients[agent].text}</p>
        <Snippet value={MCP_URL} label="Copy connector URL" />
        <a className="vl-text-link" href={clients[agent].href}>
          Setup instructions ↗
        </a>
      </section>
      <section className="rd-card setup-card">
        <Terminal aria-hidden size={23} />
        <h2>Run the connector locally</h2>
        <p>
          For a terminal or desktop MCP client, install Node.js 22 or newer.
          This Claude Code command saves the VibeLeads connection for future
          sessions. The first connection opens Apify in your browser when
          authorization is needed.
        </p>
        <Snippet
          value={
            "claude mcp add --scope user --transport stdio vibeleads -- " +
            localCommand
          }
          label="Copy install command"
        />
        <p>
          In Claude Code, open /mcp and select VibeLeads. For another local
          client, copy the configuration below into its MCP settings and restart
          it.
        </p>
        <details>
          <summary>Client configuration and API-token fallback</summary>
          <label>
            <input
              type="checkbox"
              checked={token}
              onChange={(e) => setToken(e.target.checked)}
            />{" "}
            Use an Apify API token
          </label>
          {token && (
            <p>
              Set APIFY_TOKEN in the local client’s secret environment, then
              restart the client. Keep the variable reference below literal. Use
              your own Apify account.{" "}
              <a
                className="vl-text-link"
                href="https://console.apify.com/settings/integrations"
              >
                Manage API tokens ↗
              </a>
            </p>
          )}
          <Snippet
            key={String(token)}
            value={localConfig(token)}
            label="Copy client configuration"
          />
        </details>
      </section>
      <section className="rd-card setup-prompt">
        <Copy aria-hidden size={20} />
        <h2>Let your assistant guide setup</h2>
        <p>{setupPrompt}</p>
        <CopyText value={setupPrompt} label="Copy setup prompt" />
      </section>
    </div>
  );
}
