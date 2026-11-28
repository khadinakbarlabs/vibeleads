---
name: seo-audit
description: Run an SEO audit on lead websites. Use for "do the SEO audit", "audit these sites", "SEO check on my top leads", "what SEO problems do they have", "broken links check", on a saved lead list or on websites the user names.
---

# SEO audit

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

Two checks crawl each site page by page:

- `seo`: search basics such as page titles, descriptions, headings and thin pages. About 10 cents per site.
- `links`: broken links. About 3 cents per site.

Both are limited to the top 10 sites per run.

## On a saved list

1. Get the `listId` (call `start` if needed).
2. Source quote:

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["seo", "links"], "topN": 10 } }
```

3. Show the quote, get a yes, then call again with `"approved": true` and `"maxSpendUsd"`.
4. Read the list again with `get_leads`. Findings are added to `whyTheyNeedYou`; details are in `analysis`. The lead's score and pitch line are updated.

If the answer is `TOO_MANY_SITES`, lower `topN` to 10 or remove these two checks.

## Websites the user gives

Website checks work only on a saved lead list. VibeLeads cannot check a plain website address on its own. If the user gives website addresses with no list:

1. Say so plainly: checks run on businesses in a saved list.
2. Offer to find those businesses first with [find-local-leads](../find-local-leads/SKILL.md) (their business type and city), then run the checks on that list. The checks cover the best-scored sites, so the named business may or may not be among them. Say that too.
3. If the user only wants to check their own list of sites and nothing else, tell them VibeLeads does not do that yet.

Do not use any other tool to check the sites.

## Show the result

For each site: the problems found, in plain words, worst first. Then one line on what fixing them would mean for the owner. Report only what the audit found. No ranking or traffic guesses.

## Honest limits

- An audit with no findings is not proof of good SEO. Say "no basic problems found".
- If the check status says a check failed or was partial, say which one and that no findings were added for it.
