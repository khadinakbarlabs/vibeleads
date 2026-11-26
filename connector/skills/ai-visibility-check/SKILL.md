---
name: ai-visibility-check
description: Check whether lead businesses get named in AI search answers. Use for "do the AI visibility tracking", "AI search check", "are they visible in AI answers", "AI search gap", "who is missing from AI results", on a saved lead list.
---

# AI visibility check

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

What it does: for each city in the list, VibeLeads asks one AI search assistant one question, "best (business type) in (city)", and notes which of the checked businesses were named in the answer. It is a small sample, not ongoing tracking.


## Steps

1. Get the `listId` (call `start` if needed).
2. Free quote with the `ai` check:

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["ai"], "topN": 10 } }
```

   `topN` is 10 at most for this check. The cost is per question (one per city, about 8 cents), not per lead.

3. If the answer is `BAD_ARGUMENTS` or `BAD_CHECKS` and `ai` is not an allowed check, tell the user: "The AI visibility check is not live in VibeLeads yet." Offer the SEO audit instead ([seo-audit](../seo-audit/SKILL.md)). Stop here. Do not use any other tool for it.
4. If a quote comes back, show the cost. After a yes, call again with `"approved": true` and `"maxSpendUsd"`.
5. Read the list with `get_leads`. A business that was left out while others from the list were named gets a finding in `whyTheyNeedYou`. Details (the question asked, whether it was named, which others were named) are in `analysis`.

If the answer is `TOO_MANY_SITES`, lower `topN` to 10.

## A ready-made recipe

To do it from scratch in one run, use the `ai-search-gap` playbook: it finds businesses with a website and runs this check on the 10 best. Follow [pick-a-playbook](../pick-a-playbook/SKILL.md).

## Show the result

Table: name, named in the AI answer (yes or no), which other businesses from the list were named. Explain in one line: more people now ask AI assistants for local recommendations, and in this sample the business was or was not named.

## Honest limits

- It is one answer from one AI assistant. AI answers change from one ask to the next. Always say "in one sample answer", never "they are invisible in AI".
- A business written differently from its map listing name can be missed.
- Only businesses that have a website and a city in the list are checked.
- If no answer came back for a city, nothing is said about those businesses and nothing is charged for that question.
- This is not weekly tracking. If the user wants to repeat it, run the check again later and compare.
- Do not promise that any service can guarantee a place in AI answers.
