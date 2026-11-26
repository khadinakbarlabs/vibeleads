---
description: Build your own lead recipe from steps, e.g. no website plus contact details (quote first)
argument-hint: "[what you want, e.g. contact details of Texas businesses with no website]"
---

# Build a workflow

Request: $ARGUMENTS

1. Read the `vibeleads-core` skill, then follow the `build-your-own-workflow` skill.
2. If the request misses what the user sells, the business type, the area or how many, ask one short question.
3. Call `suggest_workflow`, then `plan_workflow`. Show the steps, the cost of each and the total.
4. Wait for a yes before `run_workflow`. Mention the honest limits: filters on big cities may need a higher `lookAt`, and emails are rare for leads without a website.
5. End with: Done, Cost so far, Next.

Do this work with the VibeLeads tool; it covers every step.
