# VibeLeads connector plugin

[Install the connector from the VibeLeads catalog](../README.md#install-in-your-assistant).

Find local businesses that need your service, from inside your AI assistant.

Ask in plain words. VibeLeads finds the businesses, checks their emails and websites, gives each one a score from 0 to 100, and tells you why they need you. It always shows the price first and asks before it spends anything.

Made for freelancers and agencies (web design, SEO, ads, social media) and for businesses that sell to local businesses.

## What you can ask

- "Find dentists in Austin with no website or slow websites"
- "Find roofers in Dallas"
- "Check for weak SEO"
- "Find restaurants in Chicago that are under 4 stars"
- "Find med spas in Austin, hot leads only"
- "Find salons in London every week, only new ones"
- "Check the speed" / "Do the SEO audit" / "Do the AI visibility tracking" on your leads
- "I sell web design. Which playbook fits me?"
- "Find new businesses in Denver" / "Real estate agents in Tampa"
- "Contact details of Texas businesses with no website" (builds a custom chain of steps)
- "Only verified emails" (optional paid check, about 3.6 cents per email)
- "Write a short email for the top 5 leads"
- "Export this list to a spreadsheet"

Slash commands: `/find-leads`, `/lead-playbooks`, `/build-workflow`, `/check-websites`, `/weekly-leads`, `/export-leads`.

## Install

**Claude Code**

1. Add the published marketplace with `/plugin marketplace add khadinakbarlabs/vibeleads`. For a checkout, use the repository root as the marketplace path
2. Install the plugin: `/plugin install vibeleads@vibeleads-local`
3. Type `/mcp`, pick `vibeleads`, and sign in.

**Claude Cowork and the Claude desktop app**

Add this folder as a plugin from the plugins screen (upload or pick the folder), then connect `vibeleads` when asked.

**Cursor and Codex**

The folder also holds a Cursor manifest and a Codex manifest. Add the folder as a local plugin in those apps. The skills and the connection are the same.

## Sign-in

The plugin connects to one address:

```text
https://mcp.apify.com/?tools=khadinakbar/vibeleads
```

Sign in with your Apify account in the browser and approve access. For a local client that needs an API token, use the [stdio setup and secret-environment fallback](../README.md#install-a-local-connection).

This address gives your assistant one VibeLeads tool, plus four helpers that only read results or stop a run.

## What it costs

- The plugin is free. VibeLeads itself is free.
- You pay the listed price of each of the owner's Actors that VibeLeads runs for you, on your own Apify account. A basic lead search is about 1 cent per lead.
- Deeper checks cost extra per website: speed and domain well under 1 cent, social presence about 1 cent, broken links about 3 cents, SEO audit about 10 cents. The AI visibility sample is about 8 cents per city.
- A custom workflow costs the sum of its steps, quoted first: for example about 1.45 dollars per 100 leads for no-website leads with contact details.
- Optional premium email verification is about 3.6 cents per email, only when you ask for it.
- A ready-made playbook costs roughly 1 to 2 dollars per 100 businesses, extra checks included.
- You always get the price first. Nothing runs until you say yes, and every run has a spending cap (5 dollars unless you choose another).
- Reading saved lists, cleaning duplicates, exporting, and marking leads are free.

Prices can change. The quote you see before each run is the one that counts.

## What it does not do

- It does not send emails or messages. It writes drafts; you send them.
- It does not look up private people. Leads are public business listings.
- It does not invent leads or findings. If something cannot be checked, it says so.
- It does not check a plain website address on its own. Checks run on businesses in a saved lead list.
- Filters such as no website or low rating on a big city may need a higher look-at number. Emails are rare for businesses without a website.
- The AI visibility check is one sample answer per city, not ongoing tracking.

## What is inside

| Part | What it is |
|---|---|
| `skills/` | 21 skills: shared rules, lead searches, website checks, playbooks, cleaning and export, outreach drafts, and guides for web designers, SEO people, and ads and social agencies |
| `commands/` | 6 slash commands |
| `.mcp.json` | The VibeLeads connection |
| `TOOL-MAP.md` | Which request uses which skill and tool |
| `tests/check-plugin.mjs` | A small offline check of the plugin files |

Run the check with `node tests/check-plugin.mjs`.

## License

MIT
