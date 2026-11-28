---
name: pitch-and-outreach-drafts
description: Write outreach drafts for leads from the evidence VibeLeads found. Use for "write emails for these leads", "draft a cold email", "write a pitch", "what should I say to them", "call script", "DM for this lead", "outreach for the top 10". Drafts only; nothing is sent.
---

# Pitch and outreach drafts

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

You write the drafts yourself. VibeLeads gives the evidence. No tool sends anything.

## Steps

1. Read the leads with `get_leads` (use `priority` or `onlyWithProblem` to pick the right ones). Ask how many drafts the user wants. Default is the top 5.
2. Ask once, if you do not know: what the user sells, their name or business name, and the channel (email, phone call, or direct message).
3. For each lead, build the draft only from that lead's row:
   - `whyTheyNeedYou`: the problems found. This is the reason for contact.
   - `pitch`: a ready one-line angle.
   - `analysis`: details from deeper checks, if any.
   - `name`, `category`, `rating`, `reviews`: for a true, specific opening.
4. Show each draft under the business name with the contact detail to use (`email` with its `emailStatus`, or `phone`).

## Draft rules

- Short. Email: subject plus 60 to 110 words. Call script: 3 or 4 lines. Message: 2 or 3 sentences.
- One problem per message, the strongest one. Say how you saw it ("I looked at your site on my phone and it took about 5 seconds to open").
- One clear, low-effort ask ("Want me to send a 2-minute video of what I would fix?").
- Friendly and respectful. Never shame the owner.

## Never go beyond the evidence

- Use only facts in the lead row. No made-up numbers, lost-revenue claims, ranking claims, or "your competitors are beating you".
- If `whyTheyNeedYou` is empty, do not invent a problem. Write a growth-style note or tell the user this lead has no clear angle yet and offer a deeper check.
- Use hedged words for automated findings: "it looks like", "when I checked".
- For low ratings, follow the wording rules in [low-rating-leads](../low-rating-leads/SKILL.md).
- For accessibility hints, never mention law or compliance.

## Sending is the user's job

- Do not send, schedule, or queue messages with any tool, even if one is connected. Hand over drafts.
- Tell the user to prefer leads with `emailStatus` of `verified` or `shared-inbox`, and to follow the email and privacy rules of their country (include who they are and a way to opt out).
- After the user contacts a lead, offer to record it. See [clean-and-export-leads](../clean-and-export-leads/SKILL.md).
