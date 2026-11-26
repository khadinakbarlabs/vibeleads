---
name: hot-leads-only
description: Show or find only the hottest leads. Use for "hot leads only", "best leads first", "only warm and hot", "skip cold leads", "which leads should I contact first", or when the user asks what hot, warm and cold mean.
---

# Hot leads only

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

## What hot, warm and cold mean

Every lead gets a score from 0 to 100. Points come from: how good the business listing is, whether there is a usable email and a phone number, the problems found (no website, slow site, not secure, and so on), and whether the business is established (20 or more reviews).

- **Hot**: score 70 or more and a clear problem you can fix. Easy to reach and a real reason to call.
- **Warm**: score 45 or more. Worth contacting, but either harder to reach or no clear problem yet.
- **Cold**: under 45.

Each lead's `scoreWhy` shows how its points add up. Read it out when the user asks why a lead is hot.

## If the user already has a list

Read only the hot ones, for free:

```json
{ "tool": "get_leads", "arguments": { "listId": "<listId>", "priority": "hot", "limit": 25 } }
```

## If the user wants a new search

1. Quote with `plan_leads`. Add `"priority": "hot"` so only hot leads are delivered:

```json
{ "tool": "plan_leads", "arguments": { "niche": "med spas", "locations": ["Austin, TX"], "count": 30, "priority": "hot" } }
```

2. Show the cost, get a yes, run `find_leads` with the same arguments plus `"approved": true`, `"maxSpendUsd"` and a `listName`.

For hot and warm together use `"priority": ["hot", "warm"]`. The same argument works on playbooks.

Reading a saved list takes one value at a time: call `get_leads` once per priority.

## Be honest about numbers

- The server looks at 3 times `count` when a priority filter is on. If too few come back, raise `lookAt` and quote again.
- `count` is how many businesses are looked at, not how many hot leads come back. Only a share of any list is hot, and every business looked at is paid for. If the user wants about 30 hot leads, explain this with the quote and suggest a higher `count`. Report how many were found, filtered out and delivered.
- If few hot leads come back, show them and offer the warm ones next. Do not relabel warm leads as hot.
- Deeper website checks can turn warm leads hot by finding real problems. Offer [website-speed-check](../website-speed-check/SKILL.md) or [seo-audit](../seo-audit/SKILL.md).
