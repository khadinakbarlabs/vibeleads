---
name: build-your-own-workflow
description: Build a custom chain of steps (a workflow) when no ready-made playbook fits. Use for "no website AND their contact details", "contact details of Texas businesses with no website", "mix these checks", "build my own lead recipe", "custom workflow", or when the user wants their own combination of filters, contacts and website checks.
---

# Build your own workflow

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

A workflow is a chain of steps (called nodes) that run in order: find businesses, filter them, collect contacts, check websites, score, save. Use it when no playbook (see [pick-a-playbook](../pick-a-playbook/SKILL.md)) matches what the user wants.

## Steps

1. Ask what the user sells and what the leads must have, one question at a time. Also get the business type, the area and how many.
2. Call `suggest_workflow` (free). It answers from a fixed table of rules and returns a chain with the reason for each step and ready `planArguments`.

```json
{ "tool": "suggest_workflow", "arguments": { "sells": "web design", "needs": ["no_website", "contacts"], "niche": "roofers", "locations": ["Dallas, TX", "Houston, TX"], "count": 50 } }
```

   `sells` is one of: web design, web development, SEO, local SEO, website optimization, ads, social media, email outreach, other. `needs` is any of: contacts, no_website, slow_website, weak_seo, low_rating, new_businesses, hot_only, verified_emails, ai_visibility, email_setup, outdated_tech, site_changes. `sells` also accepts email deliverability. An unknown `sells` is treated as other; unknown `needs` are named and ignored.
3. To see every step and its live price, call `list_nodes` (free).
4. Check and price the chain with `plan_workflow` (free). Pass the returned `planArguments`, or your own `nodes`:

```json
{ "tool": "plan_workflow", "arguments": { "nodes": [ { "node": "find_places" }, { "node": "filter_website_status", "options": { "status": "none" } }, { "node": "collect_contacts" }, { "node": "validate_email" }, { "node": "score_and_pitch" }, { "node": "save_list" } ], "niche": "roofers", "locations": ["Dallas, TX"], "count": 50 } }
```

   If the chain is wrong, the answer says in plain words what is wrong and how to fix it (for example add the website check before the SEO audit). Fix it and quote again. Do not guess.
5. Show the steps, the cost of each, the total, the spending cap and the time estimate. Say it is billed to the user's own Apify account. Wait for a yes.
6. After a yes, call `run_workflow` with the same arguments plus `"approved": true`, `"maxSpendUsd"` and a `listName`.
7. Wait for the run. If it says the work has started and is not done, use `lead_status` with the `listId` until the footer says the list is ready. Then `get_leads` and, if wanted, `export_leads`.
8. Report how many leads have a phone, a usable email and a verified email. If the spending limit or time ran out, the run stops and says what was done; pass that on.

## The steps you can use

| Node | What it does | Price per unit |
|---|---|---|
| `find_places` | Finds businesses on Google Maps. Always first | about 0.4 cents per business |
| `filter_rating`, `filter_reviews` | Keep by stars or review count (`min`, `max`) | free |
| `filter_website_status` | `status`: none, has, none_or_down | free |
| `filter_new` | Looks new: few reviews (`maxReviews`, default 10) | free |
| `collect_contacts` | Reads the business's own website for phone and email | about 0.3 cents per website |
| `validate_email` | Basic email check | about 0.09 cents per email |
| `verify_email_premium` | Optional paid email check | about 3.6 cents per email |
| `check_site_up` | Does the website load | about 0.2 cents per website |
| `check_speed`, `check_domain_age` | Phone speed, domain age | about 0.3 cents per website |
| `check_broken_links`, `seo_audit` | Site crawls, top 10 sites only | about 3 and 10 cents per website |
| `check_social` | Instagram and Facebook presence | about 1.1 cents per website |
| `ai_visibility` | One AI answer per city, top 10 | about 8 cents per question |
| `check_email_setup` | Email setup grade A to F (fake-mail protection, blocklists), top 25 sites | about 0.2 cents per website |
| `detect_tech_stack` | Platform, tools and old or missing technology, top 25 sites | about 0.25 cents per website |
| `watch_site_changes` | Saves each website now; reports real changes on later runs. Needs option `watchlist` | about 1 cent per website at most |
| `score_and_pitch` | Score, priority, reason and pitch line | free |
| `filter_priority` | Keep hot, warm or cold, after scoring | free |
| `dedupe_against_list` | Skip businesses a named list already delivered | free |
| `save_list`, `export` | Save the list, CSV text | free |

Order rules: `find_places` first; `check_site_up` before deeper website checks (including `check_email_setup`, `detect_tech_stack` and `watch_site_changes`); `watch_site_changes` cannot be combined with `dedupe_against_list`; `validate_email` before `verify_email_premium`; `score_and_pitch` before `filter_priority` and `save_list`; `save_list` last (only `export` may follow). Always take prices from the live quote, not from this table.

## Worked examples

1. Contact details of Texas businesses with no website (web design or development). Chain: `find_places`, `filter_website_status` (status none), `collect_contacts`, `validate_email`, `score_and_pitch`, `save_list`. Use `locations` with several Texas cities, and raise `lookAt` (see limits). About 1.45 dollars per 100 leads.
2. Weak SEO plus contacts (SEO). Chain: `find_places`, `filter_website_status` (has), `collect_contacts`, `validate_email`, `check_site_up`, `seo_audit`, `score_and_pitch`, `save_list`. About 2.20 dollars per 100, and the SEO audit covers the best 10 sites only.
3. Low rating plus contacts (local SEO, reputation). Chain: `find_places`, `filter_rating` (max 3.9), `collect_contacts`, `validate_email`, `check_site_up`, `score_and_pitch`, `save_list`. About 2.72 dollars per 100.
4. New businesses, hot only (ads). Chain: `find_places`, `filter_new` (10 reviews or fewer), `filter_website_status` (has), `validate_email`, `check_site_up`, `check_domain_age`, `score_and_pitch`, `filter_priority` (hot), `save_list`. About 3.19 dollars per 100. Say "looks new", never an opening date.
5. Verified emails for outreach (email). Chain: `find_places`, `collect_contacts`, `validate_email`, `verify_email_premium`, `check_site_up`, `score_and_pitch`, `save_list`. About 1.56 dollars per 100. See [email-verification](../email-verification/SKILL.md).

6. Weak email setup (email deliverability). Chain: `find_places`, `filter_website_status` (has), `validate_email`, `check_site_up`, `check_email_setup`, `score_and_pitch`, `save_list`. See [tech-stack-and-email-setup-pitch](../tech-stack-and-email-setup-pitch/SKILL.md).
7. Old website technology. Same chain with `detect_tech_stack` instead of `check_email_setup`.
8. Watch for changes. Same chain with `watch_site_changes` and the option `watchlist` (for example austin-dentists). The first run is a baseline: no changes are reported until a later run with the same name.

These prices are examples from one test. The live `plan_workflow` quote is the one that counts.

## Honest limits

- Filters like no website or low rating on a big city usually need a higher `lookAt`. Google Maps shows well-rated businesses with websites first. The server looks at 3 times `count` by default; if the quote or result shows too few left, raise `lookAt` (up to 2,000) and quote again. Tell the user the cost goes up with it.
- Emails are rare for leads without a website. They mostly have a phone and no email. Say so before the user expects emails. `collect_contacts` has nothing to read when there is no website.
- "No website" means none is listed on Google Maps.
- All deeper website checks in one chain share one best-N group of leads (the smallest N asked).
- A workflow cannot be put on a timer yet. To repeat one, schedule a playbook or a plain search with [weekly-new-leads](../weekly-new-leads/SKILL.md).
- Contacts come from Google Maps and the business's own website. Never guessed.
