---
name: website-speed-check
description: Test how fast lead websites load on a phone. Use for "check the speed", "which of these sites are slow", "speed test my leads", "page speed", "slow website check", on a saved lead list or on websites the user names.
---

# Website speed check

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

The speed check tests each site the way a phone visitor sees it. It also reports the domain's expiry date when run with the domain check, and may add a few plain accessibility hints.

## On a saved list

1. You need the `listId`. If you do not have it, call `start` and let the user pick a list.
2. Source quote (no `approved`):

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["speed", "domain"], "topN": 10 } }
```

   `topN` is how many of the best-scored sites to test (1 to 50, default 10). Speed and domain together cost well under one cent per site.

3. Show the quote, get a yes, then call again with `"approved": true` and `"maxSpendUsd"`.
4. The run waits until the checks finish. Then read the list with `get_leads`. Slow sites show a finding in `whyTheyNeedYou` and numbers in `analysis`.

## A ready-made recipe

To find slow sites from scratch in one run, use the `slow-website-finder` playbook ([pick-a-playbook](../pick-a-playbook/SKILL.md)).

## On websites the user gives

See "Websites the user gives" in [seo-audit](../seo-audit/SKILL.md). The same rule applies here.

## Show the result

Table: name, website, load time or speed finding, other problems, priority. Put the slowest first. Say how many sites were tested and how many had a problem.

## Honest limits

- Sites that failed to load at all are skipped by the speed test. They already show "Website not loading".
- Some sites block automatic tests. Those get no speed finding. Say "could not be tested", not "fast".
- Speed changes from test to test. Quote the measured number as "about".
- Accessibility hints come from an automated check that cannot catch everything. Never say a site breaks a law.
