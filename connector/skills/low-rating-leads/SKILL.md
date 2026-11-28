---
name: low-rating-leads
description: Find local businesses with a low star rating. Use for "restaurants in Chicago under 4 stars", "businesses with bad reviews", "below 3.5 stars", "low rated", "reputation leads", "review management leads". Good for reputation, review and marketing services.
---

# Leads with a low rating

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

## Fastest way: a playbook

The `low-rating-rescue` playbook finds businesses under 4 stars that have at least 5 reviews, biggest gap first. Use it when the user says "under 4 stars" with no other limits. Follow [pick-a-playbook](../pick-a-playbook/SKILL.md). For any other star limit, pass `maxRating` to the playbook or search by hand as below.

## Normal way: search with rating filters

1. Turn the user's words into filters:
   - "under 4 stars" → `"maxRating": 3.9`
   - "between 3 and 4 stars" → `"minRating": 3`, `"maxRating": 4`
   - Add `"minReviews": 10` (or what the user wants) so one bad review does not put a business on the list.
2. Source quote:

```json
{ "tool": "plan_leads", "arguments": { "niche": "restaurants", "locations": ["Chicago, IL"], "count": 50, "maxRating": 3.9, "minReviews": 10 } }
```

3. Show the cost, get a yes, then `find_leads` with the same arguments plus `"approved": true`, `"maxSpendUsd"` and a `listName`.
4. Read the rows. Use `rating` and `reviews` from each lead.

Google Maps shows well-rated businesses first, so in a big city few results may be under the limit. If the quote or result shows too few, raise `lookAt` and quote again.

Businesses with no rating shown are left out when a rating filter is on. Tell the user how many were found, filtered out and delivered.

## Respectful wording

- A low rating is a reason to offer help, not proof the business is bad. Say "rated 3.6 from 48 reviews", not "bad restaurant".
- In outreach drafts, never shame the owner and never quote or guess at single reviews. Offer help with getting more happy customers to leave reviews and with answering feedback.
- Do not promise to remove reviews.
- VibeLeads gives the rating and the review count. It does not give review text.

## Show the result

Table: name, rating, review count, phone, email, website. Sort lowest rating first when the user asked for that.
