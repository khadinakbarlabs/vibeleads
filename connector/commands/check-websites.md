---
description: Check lead websites - speed, SEO, broken links, social presence or AI visibility (quote first)
argument-hint: "[speed | seo | links | social | ai] [which list or how many sites]"
---

# Check websites

Request: $ARGUMENTS

1. Read the `vibeleads-core` skill and follow it.
2. Find the list to check. If no list is known in this chat, show the user's saved lists and let them pick. Checks work only on a saved list. If the user gave plain website addresses, say so and offer to build a list first.
3. Pick the skill from the request:
   - speed, slow, domain → `website-speed-check`
   - SEO, audit, broken links → `seo-audit`
   - Instagram, Facebook, social → `social-presence-check`
   - AI visibility, AI search → `ai-visibility-check` (one sample answer per city, top 10 leads)
   - several checks in one run together with the search → `website-health-and-seo-audit`
   - nothing named → offer speed and domain first, because they are the cheapest
4. Get the free quote, show the cost per site and the total, and wait for a yes.
5. After the checks, read the list again and show what was found, worst first.

Do this work with the VibeLeads tool; it covers every step.
