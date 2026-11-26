---
name: weak-seo-leads
description: Find local businesses whose websites have weak SEO basics. Use for "check for weak SEO", "find businesses with bad SEO", "SEO leads", "who needs SEO in Denver", "weak SEO pitch". Good for SEO freelancers and agencies.
---

# Leads with weak SEO

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

SEO findings come from a page-by-page audit of each site. That audit is the costly part, so it runs only on the best sites of a list (10 at most per run).

## Fastest way: a playbook

The `weak-seo-pitch` playbook finds businesses that have a website, runs the SEO audit and a speed test on the 10 best ones, and sorts the weakest first with an SEO score to quote. Follow [pick-a-playbook](../pick-a-playbook/SKILL.md).

## Normal way: two steps

1. Get a list of businesses that have a website. Follow [find-local-leads](../find-local-leads/SKILL.md) and add `"websiteStatus": "has"`. If the user already has a saved list, use its `listId` instead.
2. Quote the SEO audit on that list:

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["seo"], "topN": 10 } }
```

3. Show the quote (about 10 cents per site). After a yes, call again with `"approved": true` and `"maxSpendUsd"`.
4. When it finishes, read the list again with `get_leads`. New findings are added to `whyTheyNeedYou` and details sit in each lead's `analysis`.

## Rules

- `topN` for the SEO check is 10 at most. For more sites, run another list or tell the user the limit. Do not promise a full-city SEO audit.
- The audit reads up to 3 pages per site and checks on-page basics. It does not measure rankings, traffic or backlinks.
- Report only what the audit found (for example missing page titles or descriptions, thin pages, missing headings). Do not guess rankings, traffic, or lost revenue.
- If the check status says the SEO check failed or was partial, say so. No finding does not mean "good SEO".

## Show the result

Table: name, website, the SEO problems found, rating, contact. Then offer outreach drafts built on those exact problems.
