---
name: email-verification
description: Check or verify the emails on leads. Use for "validate these emails", "only verified emails", "double-check the emails", "will these emails bounce", "premium email check", and when a user plans cold email outreach and cares about bounces.
---

# Email verification

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

There are two levels. Say which one you are using.

## Level 1: basic check (included in every search)

Every search and playbook runs the basic check on each email it finds. It costs about 0.09 cents per email. It looks at the address format, the mail server and known throwaway domains. It does not send a test message. Each lead shows `emailStatus`. The safest are `verified` and `shared-inbox`; `unconfirmed` may not reach anyone.

To clean the emails on a list you already have, use `clean_list` (see [clean-and-export-leads](../clean-and-export-leads/SKILL.md)). Without `approved` it returns a free quote; with `"checkEmails": true` and `"approved": true` it checks each unique email once.

## Level 2: premium verification (optional, only when asked)

The `verify_email_premium` step is a deeper paid check, about 3.6 cents per email. It is off unless the user asks for verified emails, "double-check" or a very low bounce rate. Never add it on your own.

It is a step in a workflow, so use [build-your-own-workflow](../build-your-own-workflow/SKILL.md):

1. Call `suggest_workflow` with `"needs": ["verified_emails"]`. The chain includes `validate_email` and then `verify_email_premium`.
2. Quote with `plan_workflow`. The quote shows the premium part as its own line.
3. Tell the user: about 3.6 cents per email, 10 emails by default (set `max` in the step options, top 100), only for leads that already have a usable email, best leads first. Ten emails cost about 36 cents.
4. After a yes, `run_workflow` with `approved: true`.

Example of the step with a limit:

```json
{ "node": "verify_email_premium", "options": { "max": 25 } }
```

## Honest limits

- Premium needs `validate_email` before it in the chain.
- It only checks emails that exist. Leads with no website seldom have an email, so there may be few to verify. Say how many leads have a phone, a usable email and a verified email.
- An unclear answer to "do you want verified emails" changes nothing: ask again, do not turn it on.
- No check can promise an email will be read or will not bounce. Say "verified as deliverable", never "guaranteed".
- Emails are never guessed or made up.
