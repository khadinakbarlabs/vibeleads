# VibeLeads

Find and qualify businesses from a seller’s offer and target market. This repository contains the installable VibeLeads connector, the B2B skills package and the source for the VibeLeads web app.

## Connect to the hosted Actor

Use the following URL in an assistant that supports remote MCP. Sign in with your own Apify account when prompted.

```text
https://mcp.apify.com/?tools=khadinakbar/vibeleads
```

Start by asking “Show me the available lead-generation playbooks.” Review the Actor’s quote before approving a paid run. Apify hosts and bills Actor execution. The repository contains the connector and web client. [Apify Actor and pricing](https://apify.com/khadinakbar/vibeleads)

## Install in your assistant

| Client | How to install |
|---|---|
| Claude Code | Run `/plugin marketplace add khadinakbarlabs/vibeleads`, then `/plugin install vibeleads@vibeleads-local`. Open `/mcp` and sign in to Apify. |
| Codex with local plugin support | Clone this repo. Run `codex plugin marketplace add /absolute/path/to/vibeleads`, then `codex plugin add vibeleads@vibeleads-local`. Reload the host and connect your Apify account. |
| Cursor | Import the complete `connector/` plugin folder using your client’s local plugin support. You can also configure the hosted URL above as an HTTP MCP server. |
| Other remote MCP clients | Add the hosted URL above to your client's HTTP MCP settings. |

The original skills package keeps the identifier `vibeleads-b2b@vibeleads-local` and the `plugin/` installation path. It adds research, lead-quality review and reporting skills. Its tagged ZIPs remain available. [B2B skills and install instructions](SKILLS-PLUGIN.md) · [Release downloads](https://github.com/khadinakbarlabs/vibeleads/releases/latest)

Claude Code can also use this checkout’s project-level MCP entry. Choose either the plugin connection or the project connection to avoid registering the same server twice. To verify a checkout without starting an Actor, set `APIFY_TOKEN` in your environment and run `node examples/check-connector.mjs`. The command initializes the MCP session and lists tools.

## Run the web app

The Next.js web client lives in `web/`. It includes account authentication, billing integration, the Apify workspace, application routes and Supabase migrations. [Local setup and service dependencies](web/README.md) · [VibeLeads product website](https://vibeleads.app/) · [Sign in to the workspace](https://vibeleads.app/workspace) · [Plugin licensing](LICENSE) · [Web application rights](web/NOTICE.md)

## Release archives

The current release contains the connected VibeLeads 1.2.0 plugin and VibeLeads B2B skills 0.3.1. Choose a root ZIP for a host importer or a portable ZIP to extract the named plugin directory. Verify the download against `SHA256SUMS.txt`. To reproduce all four archives from a checkout, run `python3 scripts/package_distribution.py --output /absolute/path/outside-the-checkout`.
