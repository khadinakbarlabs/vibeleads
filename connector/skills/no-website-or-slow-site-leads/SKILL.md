---
name: no-website-or-slow-site-leads
description: Find local businesses that have no website, or a slow, broken or not secure website. Use for "dentists in Austin with no website", "businesses without a website", "slow websites", "bad websites I can redesign", "website redesign leads". Good for web designers and web agencies.
---

# Leads with no website or a slow website

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

## Fastest way: a playbook

These playbooks do the whole job in one run. Follow [pick-a-playbook](../pick-a-playbook/SKILL.md):

- `no-website-finder`: no website listed, or a website that does not load. Busiest businesses first.
- `slow-website-finder`: has a website that is slow on phones. Slowest first, with the speed score.
- `website-redesign-pitch`: missing, broken, slow or not secure. Worst first.

If the user asks for "no website or slow website" together, use `website-redesign-pitch`.

## By hand: search with a website filter

1. Source quote with `plan_leads`. Add `websiteStatus`:
   - `"none"`: no website listed
   - `"none_or_down"`: no website, or a website that does not load
   - `"has"`: has a website (use this before speed checks)
   - `"any"`: both (default)

```json
{ "tool": "plan_leads", "arguments": { "niche": "dentists", "locations": ["Austin, TX"], "count": 40, "websiteStatus": "none_or_down" } }
```

2. Show the cost, get a yes, then call `find_leads` with the same arguments plus `"approved": true`, `"maxSpendUsd"` and a `listName`.
3. Read the rows. Each lead's `whyTheyNeedYou` lists what was found: "No website", "Website not loading", "Not secure", "Slow website (4.2s to load)", "Slow server response".
4. Tell the user how many businesses were found, filtered out and delivered.

For an existing list, `get_leads` with `"onlyWithProblem": true` shows only leads that have a problem.

## Slow websites: confirm with a real speed test

The first search only catches clearly slow or broken sites. For a proper phone speed test, run [website-speed-check](../website-speed-check/SKILL.md) on the saved list. It costs extra, so quote first.

## Show the result

Two groups: "No website" and "Has a website with problems". For each lead show name, phone, email, rating, review count, and the exact finding. Then offer outreach drafts.

## Honest limits

- No-website leads are rare in some trades and cities. On a big city, raise `lookAt` so more businesses are looked at before the filter, and quote again.
- Leads without a website mostly have a phone and no email. Say so. For their contact details in one run, use [build-your-own-workflow](../build-your-own-workflow/SKILL.md).
- "No website" means the public listing shows none. A few businesses have a site that is not on their listing. Say "no website listed".
- Some sites block automatic checks. Those get no finding instead of a false "broken". Never call a site broken unless the result says so.
