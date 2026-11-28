# VibeLeads

VibeLeads is an open-source prospecting agent for your AI assistant. Start with “I am a video editor.” If you already have a target customer, include it. Use the MIT-licensed connector and playbooks to find prospects, research buying signals, enrich contacts and score fit. Hosted Actor searches run on your own Apify account. Included public search runs in your assistant when its web search is available. Apify hosts the engine. The web application is source-available under separate terms.

## Connect to the hosted Actor

Use the following URL in an assistant that supports remote MCP. Sign in with your own Apify account when prompted.

```text
https://mcp.apify.com/?tools=khadinakbar/vibeleads
```

With the plugin installed, try “I am a web designer.” It proposes buyer groups, looks for open requests when your assistant has public search, and can quote a search for suitable businesses. Review the source estimate and any additional usage before approving a paid search. A hosted call can incur platform usage even when it only returns a plan. The local planner and included host search make no new Apify run. Apify hosts and bills Actor execution. The repository contains the connector and web client. [Apify Actor and pricing](https://apify.com/khadinakbar/vibeleads)

## Install a local connection

With Node.js 22+ and Claude Code installed, run the following once. It saves a user-level MCP connection across restarts. Open `/mcp` in Claude Code and select VibeLeads. Apify provides browser OAuth when authentication is needed.

```sh
claude mcp add --scope user --transport stdio vibeleads -- npx --yes mcp-remote@0.16.7 "https://mcp.apify.com/?tools=khadinakbar/vibeleads"
```

For another desktop stdio client set the command to `npx` and the arguments to `["--yes","mcp-remote@0.16.7","https://mcp.apify.com/?tools=khadinakbar/vibeleads"]`. If browser authorization is unavailable, set `APIFY_TOKEN` in the local client's secret environment and append `["--header","Authorization: Bearer ${APIFY_TOKEN}"]` to those arguments. The bridge expands the literal variable internally. Keep the token out of chat, URLs and checked-in configuration. [Bridge documentation](https://github.com/punkpeye/mcp-remote) · [Copy the setup prompt or client configuration](https://vibeleads.app/connect)

ChatGPT users can open **Plugins → + → Add custom MCP server**, paste the hosted URL above and choose OAuth. In Claude, use **Settings → Connectors → Add custom connector**. Use the same Apify identity in the assistant and the [results dashboard](https://vibeleads.app/workspace). The dashboard reads your saved prospect lists and Actor-run datasets. Open a list for contact coverage, filtering and CSV export. This works with either connection method. In chat, use `lead_search_status` with a list ID, offset and limit for prospecting or enrichment lists. For local lists use `get_leads` or `export_leads`. Some saved data is cleaned up after about 30 days. Export a CSV to retain a copy.

## Install in your assistant

| Client | How to install |
|---|---|
| Claude Code | Run `/plugin marketplace add khadinakbarlabs/vibeleads`, then `/plugin install vibeleads@vibeleads-local`. Open `/mcp` and sign in to Apify. |
| Codex with local plugin support | Clone this repo. Run `codex plugin marketplace add /absolute/path/to/vibeleads`, then `codex plugin add vibeleads@vibeleads-local`. Reload the host and connect your Apify account. |
| Cursor | Import the complete `connector/` plugin folder using your client’s local plugin support. You can also configure the hosted URL above as an HTTP MCP server. |
| Other remote MCP clients | Add the hosted URL above to your client's HTTP MCP settings. |

The original skills package keeps the identifier `vibeleads-b2b@vibeleads-local` and the `plugin/` installation path. It adds research, lead-quality review and reporting skills. Its tagged ZIPs remain available. [B2B skills and install instructions](SKILLS-PLUGIN.md) · [Release downloads](https://github.com/khadinakbarlabs/vibeleads/releases/latest)

Claude Code can also use this checkout’s project-level MCP entry. Choose either the plugin connection or the project connection to avoid registering the same server twice. To verify a checkout without starting an Actor, set `APIFY_TOKEN` in your environment and run `node examples/check-connector.mjs`. The command checks registered seller routing, project storage and readback methods without executing them. A missing feature returns a failing exit code and recovery instructions. Check the actions shown in your chat as well.

## Run the web app

The Next.js web client lives in `web/`. It includes account authentication, billing integration, the Apify workspace, application routes and Supabase migrations. [Local setup and service dependencies](web/README.md) · [VibeLeads product website](https://vibeleads.app/) · [Sign in to the workspace](https://vibeleads.app/workspace) · [Plugin licensing](LICENSE) · [Web application rights](web/NOTICE.md)

## Where it fits

VibeLeads is an alternative for teams using these products for prospecting, signal research, enrichment or fit scoring. Apollo and Clay overlap on list building and enrichment. GojiBerry overlaps on buying-signal prospecting. Xply describes social feedback workflows; that comparison is limited to signals. The web app has separate source-available terms. [Apollo](https://www.apollo.io/) · [Clay](https://www.clay.com/) · [GojiBerry](https://www.gojiberry.ai/) · [Xply](https://xply.com/) · [License scope](LICENSE)

## Release archives

A seller project can use your website to draft a buyer profile, remember your preferences and choose between checking a saved lead and searching again. It shows the buyer’s dated request, the invited response route and actual discovery cost per usable opportunity. These features use the seller-project tool on the connected backend. Hosts with an older backend can use the included search in the current chat.

This checkout builds the connected VibeLeads 1.4.1 and VibeLeads B2B 0.5.1 candidates. The public downloads page shows which versions have been released. Choose a root ZIP for a host importer or a portable ZIP to extract the named plugin directory. Verify the download against `SHA256SUMS.txt`. To reproduce all four archives from a checkout, run `python3 scripts/package_distribution.py --output /absolute/path/outside-the-checkout`.
