---
name: pick-a-playbook
description: Choose and run a ready-made VibeLeads playbook. Use for "what playbooks do you have", "lead playbooks", "show me lead ideas for a web designer", "run the website redesign playbook", "new business finder", "real estate agent leads", or when the user says what they sell and wants a ready recipe.
---

# Pick a playbook

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

A playbook is a ready recipe: a search, the right filters, the right extra checks on the best leads, and a ranking and pitch line made for one kind of offer.

## Steps

1. Ask what the user sells and to whom, if you do not know.
2. List what is live. Never list playbooks from memory:

```json
{ "tool": "list_playbooks", "arguments": { "audience": "freelancer", "service": "web design" } }
```

   Both arguments are optional. `audience` is `"freelancer"`, `"agency"` or `"business"`. `service` is what the user sells, in their words. If nothing matches, the answer returns all playbooks and says so.

3. Show the choices in plain words: name, what it promises, its limits, and the rough cost per 100 leads. Ask the user to pick one, plus the business type, the area and how many.
4. Source quote. Use the playbook id exactly as returned:

```json
{ "tool": "plan_playbook", "arguments": { "playbook": "website-redesign-pitch", "niche": "dentists", "locations": ["Austin, TX"], "count": 50 } }
```

   Optional: any search filter from vibeleads-core (they override the playbook's own), and `extraTopN` (how many of the best leads get the extra checks).

5. Show the steps, the cost and the playbook's limits. Get a yes. Then run it with the same arguments plus approval, a cap and a list name:

```json
{ "tool": "run_playbook", "arguments": { "playbook": "website-redesign-pitch", "niche": "dentists", "locations": ["Austin, TX"], "count": 50, "listName": "austin-dentists-redesign", "approved": true, "maxSpendUsd": 5 } }
```

6. A playbook takes about 2 to 8 minutes. Wait for the run. If the answer says the playbook has started and is not done, call `lead_status` with the `listId` until its footer says the list is ready. Do not run it again.
7. Read the leads (dataset rows, or `get_leads` with the `listId`). They are sorted best match for the playbook first. The answer also says on how many leads the extra check ran (`checked`), and each row's `extraChecks` says whether it was checked.

## The playbooks

Only offer one that `list_playbooks` returned.

| Playbook | Finds | Extra checks (on the best leads only) |
|---|---|---|
| `website-redesign-pitch` | Website missing, broken, slow on phones or not secure | Speed and domain, best 25 (up to 50) |
| `no-website-finder` | No website listed, or one that does not load | None |
| `slow-website-finder` | Website slow on phones, with the speed score | Speed, best 25 (up to 50) |
| `weak-seo-pitch` | Website fails search basics, with an SEO score | SEO audit and speed, best 10 |
| `outdated-tech-pitch` | Website runs old or missing technology (old platform, old libraries, dead analytics, no tracking) | Tech check and speed, best 10 (up to 25) |
| `email-setup-pitch` | Website email set up weakly: grade C to F for fake-mail protection and blocklists | Email setup check, best 10 (up to 25) |
| `low-rating-rescue` | Under 4 stars with at least 5 reviews | None |
| `dead-social-pitch` | Instagram or Facebook missing, quiet or tiny | Social, best 25 (up to 50) |
| `ai-search-gap` | Named or left out in one AI answer for "best (type) in (city)" | AI sample, best 10 |
| `new-business-finder` | Businesses that look new: 10 reviews or fewer, young website address or none | Domain age, best 50 |
| `real-estate-agent-leads` | Real estate agents, agencies and property managers | Social, best 25 (up to 50) |

## Rules

- Extra checks run only on the best leads that have a working website. Other leads are marked "not checked". Say "not checked", never "no problem".
- `real-estate-agent-leads` needs no business type. It runs three searches per city, so use 8 cities at most.
- `new-business-finder`: there is no public opening date. Say "looks new", never "opened this month".
- `low-rating-rescue` uses the star rating and review count only. It does not read review text. Follow the wording rules in [low-rating-leads](../low-rating-leads/SKILL.md).
- `ai-search-gap` is one sample answer per city. Follow [ai-visibility-check](../ai-visibility-check/SKILL.md).
- If the spending cap would be passed, the extra checks are skipped and the leads say so. Tell the user.
- A playbook costs the search plus its extra checks. The quote shows the total before anything runs.

## If no playbook fits

Use a plain search: [find-local-leads](../find-local-leads/SKILL.md). It works for any business type. For your own mix of steps, call `suggest_workflow` and follow [build-your-own-workflow](../build-your-own-workflow/SKILL.md).
