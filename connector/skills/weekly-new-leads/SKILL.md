---
name: weekly-new-leads
description: Set up a daily or weekly automation that brings only new leads. Use for "find salons in London every week, only new ones", "send me new leads every Monday", "daily leads", "recurring lead search", "automate this search", and for pausing, stopping or listing automations.
---

# Weekly new leads

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

An automation runs the same search on a timer in the user's own Apify account. It costs money on every run, so the user must agree to the cost per run first.

## Set one up

1. Collect: business type, area, how many per run, daily or weekly. Default is weekly.
2. Pick a list name (lowercase letters, numbers, dashes), for example `london-salons`. The list name is what makes runs deliver only new businesses.
3. Free quote for one run with `plan_leads` (same niche, locations, count and filters). If the user wants a playbook on a timer, quote with `plan_playbook` instead.
4. Tell the user: the cost per run, the rough cost per month (weekly is about 4 runs, daily about 30), that it runs at 08:00 UTC (weekly on Mondays), and that only businesses not already delivered to this list are sent. Ask for a yes.
5. After a yes:

```json
{ "tool": "schedule_leads", "arguments": { "niche": "salons", "locations": ["London, UK"], "count": 30, "frequency": "weekly", "listName": "london-salons", "approved": true, "maxSpendUsd": 5 } }
```

`maxSpendUsd` is the cap for each run. The same filters as a normal search work here (`maxRating`, `websiteStatus`, `priority` and the rest). To run a playbook on the timer, add `"playbook": "<playbook id>"`, for example `no-website-finder`. If no `listName` is given, one is made from the business type and area.

6. Read the answer:
   - If it has `scheduleId`, the automation is on. Tell the user the name and when it runs.
   - If it has `setupSteps`, Apify needs the user to save the automation themselves. Give them the steps, the timer value and the input exactly as returned. It takes about a minute.

## Where the new leads go

Each run saves its leads in that run's dataset in the user's Apify account. The user can connect that to a spreadsheet or another app with Apify's own integrations. In chat, call `start` to see the latest saved lists, then `get_leads`.

## Manage or stop

```json
{ "tool": "manage_schedules", "arguments": { "action": "list" } }
```

`action` is `list`, `pause`, `resume` or `delete`. For the last three also send `scheduleId`. Confirm with the user before deleting. If the answer says automations live in Apify Console, give the user that link instead.

## Honest limits

- Only daily and weekly are offered.
- A custom workflow cannot be put on a timer yet. Schedule a playbook or a plain search instead.
- When an area runs dry, runs bring few or no new leads. Say so and suggest adding nearby cities.
- If a run would cost more than the cap, it is skipped, not charged.
