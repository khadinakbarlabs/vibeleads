---
description: Find local business leads with VibeLeads (quote first, runs only after your yes)
argument-hint: "[business type] in [city], e.g. roofers in Dallas, under 4 stars, hot only"
---

# Find leads

Request: $ARGUMENTS

1. Read the `vibeleads-core` skill and follow it.
2. Pick the matching skill from the request:
   - no website, slow or broken website → `no-website-or-slow-site-leads`
   - weak SEO → `weak-seo-leads`
   - under N stars, low rating → `low-rating-leads`
   - hot, warm or cold only → `hot-leads-only`
   - their own mix of steps, or "contact details" together with a filter → `build-your-own-workflow`
   - anything else → `find-local-leads`
3. If the request is empty or misses the business type or the area, ask one short question.
4. Get the free quote, show the cost, and wait for a yes before any paid step.
5. Show the leads in a short table and end with: Done, Cost so far, Next.

Do this work with the VibeLeads tool; it covers every step.
