---
name: tech-stack-and-email-setup-pitch
description: Find local businesses whose website technology is old or whose email setup is weak, and watch their websites for changes. Use for "who runs an old WordPress", "outdated website technology leads", "check email setup", "email deliverability leads", "SPF DMARC problems", "watch these sites for changes", "pitch email deliverability".
---

# Outdated technology, weak email setup and site changes

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

Three checks read the businesses' own public websites. Each is billed per website to the user's own Apify account, on the best leads only.

| Check | What it reads | Playbook | Check name in `analyze_website` | Workflow step |
|---|---|---|---|---|
| Email setup | Grade A to F for protection against fake email and blocklists | `email-setup-pitch` | `emailsetup` | `check_email_setup` |
| Website technology | Platform, tools, old or missing technology | `outdated-tech-pitch` | `tech` | `detect_tech_stack` |
| Site changes | A saved copy now, real changes on later runs | none | `watch` | `watch_site_changes` |

## Steps

1. Ask what the user sells. Weak email setup suits email deliverability and outreach help. Old technology suits web design and development.
2. For email setup or technology, use the playbook. Quote with `plan_playbook` (free), show the cost, and wait for a yes:

```json
{ "tool": "plan_playbook", "arguments": { "playbook": "email-setup-pitch", "niche": "dentists", "location": "Austin, TX", "count": 10 } }
```

3. After a yes, call `run_playbook` with the same arguments plus `"approved": true`, `"maxSpendUsd"` and a `listName`. Then follow `lead_status` and `get_leads` as in [pick-a-playbook](../pick-a-playbook/SKILL.md).
4. To check a list that is already saved, use `analyze_website` with `"checks": ["emailsetup"]` or `["tech"]`. Quote first, then approve.
5. For site changes, pick a watchlist name (lowercase letters, numbers and dashes) and keep it:

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["watch"], "watchlist": "austin-dentists", "topN": 10 } }
```

## Rules

- Say what was found, with the grade or technology named. The email grade is about how safely the domain sends email. It is not a check of any private inbox.
- The first watch run only saves a starting point (a baseline). Tell the user no changes will show until a later run with the same watchlist name and the same websites. Do not promise a change.
- If a website could not be read, the result says so for that lead. Do not claim a problem or a pass for it. Leads outside the best group are "not checked".
- Premium or extra paid options of these checks are never switched on by VibeLeads.
- Watch checks cannot be combined with `dedupe_against_list` in a workflow.

## Show the result

Table: name, website, the grade or technology found, the pitch angle. Then offer outreach drafts through [pitch-and-outreach-drafts](../pitch-and-outreach-drafts/SKILL.md) built only on these findings.
