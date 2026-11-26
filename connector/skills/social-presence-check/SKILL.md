---
name: social-presence-check
description: Check whether lead businesses have active social media. Use for "check their Instagram", "who has dead social accounts", "social media check", "inactive Facebook pages", "find businesses that stopped posting", "social media leads". Good for social media managers and ad agencies.
---

# Social presence check

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

The social check finds each lead's Instagram and Facebook pages and reports missing, dead or inactive accounts.

## Steps

1. Get the `listId` (call `start` if needed).
2. Free quote:

```json
{ "tool": "analyze_website", "arguments": { "listId": "<listId>", "checks": ["social"], "topN": 20 } }
```

   Options:
   - `socialNetworks`: any of `"instagram"`, `"facebook"`, `"tiktok"`, `"twitter"`. Default is Instagram and Facebook. The other two cost extra.
   - `facebookDetails`: true adds page details for a little more per site.
   - `topN`: 1 to 50.

3. Show the quote (a bit over one cent per site by default), get a yes, then call again with `"approved": true` and `"maxSpendUsd"`.
4. Read the list with `get_leads`. Social findings are in `whyTheyNeedYou`; account details are in `analysis`.

## A ready-made recipe

To do it from scratch in one run, use the `dead-social-pitch` playbook: it finds the businesses and runs this check on the best 25. Follow [pick-a-playbook](../pick-a-playbook/SKILL.md).

## Show the result

Table: name, Instagram, Facebook, what was found (no account, account not found, no recent posts, few followers), contact.

## Honest limits

- Instagram gets a real "stopped posting" signal. Facebook mostly shows whether the page exists and its followers. Do not call a Facebook page inactive unless the result says so.
- Social pages are found from each business's own website. Leads with no working website are not checked and are marked "not checked".
- An account that was not found may exist under another name. Say "no account found", not "they have none".
- If the check status says the social check was partial, say which network was missed.
- Only public business pages are checked. No private profiles.
