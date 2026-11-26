---
name: website-health-and-seo-audit
description: Use the website-check steps of a workflow - is the site up, phone speed, domain age, broken links, SEO audit, social presence and AI visibility - as nodes in one chain. Use for "check which sites are down, then speed and SEO", "full website health report on my leads", "audit sites in one run", "site up check then SEO".
---

# Website health and SEO audit as workflow steps

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

The single-check skills ([website-speed-check](../website-speed-check/SKILL.md), [seo-audit](../seo-audit/SKILL.md), [social-presence-check](../social-presence-check/SKILL.md), [ai-visibility-check](../ai-visibility-check/SKILL.md)) check a list you already saved. This skill puts the same checks inside one workflow, so the search, the filters and the checks run in a single run. Build it with [build-your-own-workflow](../build-your-own-workflow/SKILL.md).

## The website steps

| Node | Needs first | What it finds | About per website |
|---|---|---|---|
| `check_site_up` | `find_places` | Not loading, slow, not secure | 0.2 cents |
| `check_speed` | `check_site_up` | Phone speed score | 0.3 cents |
| `check_domain_age` | `check_site_up` | Domain age and expiry | 0.3 cents |
| `check_broken_links` | `check_site_up` | Broken links, a sample of pages | 3 cents |
| `seo_audit` | `check_site_up` | On-page SEO basics, up to 3 pages | 10 cents |
| `check_social` | `check_site_up` | Instagram and Facebook found, still posting | 1.1 cents |
| `ai_visibility` | `check_site_up` | Is the business named in one AI answer | 8 cents per city |

`check_site_up` must come before every other website check. The deeper checks run on the best-scored leads that have a working website, not on every lead. Take exact prices from the live `plan_workflow` quote.

## Steps

1. Ask which checks the user wants and for which business type and area. If they only say "check the websites", offer `check_site_up` and `check_speed` first because they are cheapest.
2. Build the chain and quote it with `plan_workflow`. Example for a health report on businesses that have a site:

```json
{ "tool": "plan_workflow", "arguments": { "nodes": [ { "node": "find_places" }, { "node": "filter_website_status", "options": { "status": "has" } }, { "node": "validate_email" }, { "node": "check_site_up" }, { "node": "check_speed", "options": { "topN": 25 } }, { "node": "seo_audit", "options": { "topN": 10 } }, { "node": "score_and_pitch" }, { "node": "save_list" } ], "niche": "dentists", "locations": ["Austin, TX"], "count": 40 } }
```

3. Show the cost per step and the total. Get a yes. Run with `run_workflow`, `approved: true`, `maxSpendUsd`.
4. Read the list with `get_leads` (`onlyWithProblem: true` shows only leads with a problem). Show the problems worst first, in plain words.

## Honest limits

- Link and SEO crawls cover at most 10 sites per run. Other leads are marked "not checked". Say "not checked", never "no problem".
- SEO is on-page basics only. No rankings, traffic or backlinks.
- Leads without a working website are not checked by the deeper steps.
- Some sites block automatic checks. Those get no finding instead of a false "broken".
- The AI visibility check is one sample answer per city, not tracking.
