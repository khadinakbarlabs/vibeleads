# VibeLeads

Tell your assistant what you sell. Start with “I am a video editor.” If you have a website, share it. VibeLeads can read your offer and draft an ideal customer profile for you to edit. An assistant with included public search can start looking for buyers from your description alone.

## Connect your assistant

For an assistant with remote MCP support, add this server and sign in with the Apify account where you want to save results.

```text
https://mcp.apify.com/?tools=khadinakbar/vibeleads
```

In ChatGPT, add a custom MCP server with OAuth and enable it in your chat. In Claude, add a custom connector under Settings and select Connect. For a terminal or desktop client, the [connection guide](https://www.vibeleads.app/connect) includes instructions for browser sign-in, the local stdio bridge and a token stored in your client’s secret environment.

**Install the playbooks from GitHub.** In Claude Code, run the following commands.

```sh
claude plugin marketplace add https://github.com/khadinakbarlabs/vibeleads.git
claude plugin install vibeleads@vibeleads-local
```

In Codex, clone the repository and replace the path below with the checkout directory.

```sh
codex plugin marketplace add /absolute/path/to/vibeleads
codex plugin add vibeleads@vibeleads-local
```

**Install from a downloaded ZIP.** For a portable ZIP, use the extracted vibeleads directory. For a root ZIP, extract it into its own directory. Change to the directory containing this README and the hidden .claude-plugin folder. Use the pair for your client.

```sh
claude plugin marketplace add "$PWD"
claude plugin install vibeleads@vibeleads
```

```sh
codex plugin marketplace add "$PWD"
codex plugin add vibeleads@vibeleads
```

Reload the client. Open the connector and sign in. Hosts with a ZIP importer can use the root ZIP. For a client that accepts a plugin folder, import the complete extracted folder with its hidden files. With Node.js 22 or newer, run the offline file check from the folder containing this README.

```sh
node tests/check-plugin.mjs
```

## Find customers

Say what you do or share your website. Your assistant infers the offer, likely buyers and buying signals, then shows a short profile you can correct. Keep each brand in its own project on the same connected account. Saved feedback and preferences help choose what to check on return. A technical audit of a prospective customer's website uses a saved prospect list.

The assistant checks saved opportunities, looks for fresh demand and opens the buyer’s original request. Timing depends on the work, closure and deadlines. A usable opportunity needs a still-open request, a fit for your offer and an invited route you can use. Expect the date, requirements, link and next step. Suitable businesses to pitch are listed separately. A buyer inviting an application and an independently verified individual email are different outcomes.

If your assistant has no included public search, it can show a price for an available source. If project tools are missing, reload or reconnect the server and refresh the tools in your chat. Included search can continue in the current chat while project storage is unavailable. Your assistant should tell you which records and costs it can confirm.

## What you pay

The download and local planner have no Apify charge. Included search uses your assistant's existing allowance. Calling the hosted Actor can incur Apify platform usage even for a preview, quote, project update or export. A delivered jobs shortlist can have a result fee. Additional sources, contact checks, storage and source minimums can affect the final bill. [Live Apify pricing](https://apify.com/khadinakbar/vibeleads/pricing)

Before a paid search, review its source estimate, other charges, and whether a firm total limit is available. The ordinary source estimate defaults to $5. If you require a firm all-in limit, continue with local or included work until the quoted route can enforce it or you accept the extra cost. The seller report uses recorded spend across sources and distinct usable opportunities. It shows unknown charges explicitly and leaves unit cost undefined when none qualify.

## Saved results

Ask for your results, their evidence, an export or an outreach draft. Scheduled searches need separate approval for the cost and frequency. The plugin can update your project, save lists and mark outcomes. You decide whether to send a message or application. [Results dashboard](https://www.vibeleads.app/workspace)

## License

MIT
