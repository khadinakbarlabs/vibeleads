---
name: find-local-leads
description: Find local business leads for any business type in any city. Use when the user says things like "find roofers in Dallas", "get me 100 dentists in Austin and Houston", "local leads for plumbers", "businesses near Manchester", or names a niche and a place. Handles one city, several cities, and how many leads.
---

# Find local leads

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

## What you need from the user

1. Business type (for example "roofers").
2. Area: one city or several. Add state or country when the name is unclear ("Dallas, TX", "Manchester, UK").
3. How many. If they did not say, use 50.

Ask only for what is missing, one question at a time.

## Steps

1. Source quote. Call `plan_leads`:

```json
{ "tool": "plan_leads", "arguments": { "niche": "roofers", "locations": ["Dallas, TX"], "count": 50 } }
```

   Useful extras: `onlyWithEmail` (true keeps only leads with a usable email), `minScore`, `minRating`, `maxRating`, `minReviews`, `maxReviews`, `websiteStatus`, `priority`. See the argument table in vibeleads-core.

2. Show the plan and the estimated cost. Say it is billed to their own Apify account. Ask "Shall I run it?"
3. After a yes, call `find_leads` with the same arguments plus approval, a cap, and a list name:

```json
{ "tool": "find_leads", "arguments": { "niche": "roofers", "locations": ["Dallas, TX"], "count": 50, "listName": "dallas-roofers", "approved": true, "maxSpendUsd": 5 } }
```

4. Wait for the run to finish (`get-actor-run`). Read the lead rows with `get-dataset-items`. Read `RUN_SUMMARY` for `listId`, `leadsDelivered` and `usageUsd`.
5. Show the best leads in a table and give the totals: how many were found, filtered out and delivered, how many are hot, how many have a usable email, how many have a website problem.
6. Offer next steps once: deeper website checks, export to a spreadsheet, outreach drafts, or a weekly run for new leads.

## Several cities and big lists

- Put every city in `locations` (up to 25). One text such as "Austin, Dallas and Houston" in `location` also works and is split into three cities. Duplicates across cities are removed.
- One city gives roughly 60 to 120 businesses. For 1,000 leads use about 10 to 15 cities. The top limit is 2,000 leads per run.
- `count` is how many businesses are looked at. With filters on, fewer are delivered. If the user wants a set number of filtered leads, explain this with the quote and suggest a higher `count` or more cities.
- With a rating, review, website or priority filter, the server looks at 3 times `count` by default. In a big city that can still leave too few. Raise `lookAt` (up to 2,000) and quote again; the cost goes up with it.
- If the user wants their own mix of steps (for example no website plus contact details), use [build-your-own-workflow](../build-your-own-workflow/SKILL.md).
- If fewer leads come back than asked, say so plainly. The map simply had fewer matches. Suggest nearby cities or a related business type.

## Honest limits

- Leads are public business listings. No private people.
- An email marked `unconfirmed` may not reach anyone. `verified` and `shared-inbox` are the safest.
- If the run found nothing new because the named list already has those businesses, say that, and suggest a new area.
