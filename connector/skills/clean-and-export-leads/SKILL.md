---
name: clean-and-export-leads
description: Clean, export and track a lead list. Use for "remove duplicates", "clean this list", "export to CSV", "put it in a spreadsheet", "download my leads", "mark this lead as contacted", "they replied", "we won this one", "which leads work best for me".
---

# Clean, export and track leads

Follow [vibeleads-core](../vibeleads-core/SKILL.md) first.

## Clean a list

Works on a saved list (`listId`) or on the user's own rows (`rows`, up to 5,000). Give one of the two, not both.

```json
{ "tool": "clean_list", "arguments": { "listId": "<listId>", "mode": "flag" } }
```

- `mode`: `"flag"` (default) keeps every row and marks duplicates. Nothing is deleted. `"clean"` returns one merged row per business.
- Only with `"clean"`: `dropChains`, `dropNonBusiness`, `dropClosed`.
- `defaultCountry`: two letters, for example "US", to read phone numbers that have no country code.
- `view`: `"cleaned"` for the rows, `"audit"` for one line per row with the reason.
- Paging: `limit` (up to 200), `offset`, and `cleanId` to continue an earlier cleaning job.

Cleaning is free. Two optional checks cost money: `checkSites` (dead or parked websites) and `checkEmails` (bad emails). Without `approved` they return a free quote. For a deeper paid email check see [email-verification](../email-verification/SKILL.md). Show it, get a yes, then call again with `"approved": true` and `"maxSpendUsd"`.

Tell the user the count: rows in, kept, merged, dropped. Start with `"flag"` unless the user asked to remove rows.

## Export

```json
{ "tool": "export_leads", "arguments": { "listId": "<listId>" } }
```

The answer has `filename` and `csv` text. Give the user the CSV as a file or a code block they can save. It opens in Google Sheets or Excel. Columns: score, priority, name, category, phone, email, email status, website, why they need you, pitch, rating, reviews, address, map link. Do not change the data when you pass it on.

## Track what happened

When the user tells you the result of contacting a lead:

```json
{ "tool": "mark_lead", "arguments": { "listId": "<listId>", "leadId": "<leadId>", "status": "replied", "note": "asked for a quote" } }
```

`status` is one of `contacted`, `replied`, `won`, `no_reply`, `bad_fit`. `leadId` comes from the lead row.

## Learning from marks

- After 5 results for the same kind of lead, read lists with `"sortBy": "fit"` in `get_leads`. Leads like past replies and wins move up a little (10 points at most).
- After 10 marks in a list, the answer shows which problems get the most replies. Tell the user which pitch angle is working.
- This is simple counting of the user's own results. Do not oversell it.
