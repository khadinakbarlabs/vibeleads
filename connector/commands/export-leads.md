---
description: Export saved prospect lists or seller opportunities to CSV for Google Sheets or Excel
argument-hint: "[which list or seller project] [clean first: yes or no]"
---

# Export leads

Request: $ARGUMENTS

1. Read the `vibeleads-core` skill. Keep the list family and ID returned by the search or chosen in the picker. The start action accepts offset and limit and returns savedLists, total and nextOffset. Copy nextOffset into offset and retain limit until nextOffset is null. Each entry identifies its kind and readTool. Offer the dashboard or the original run link if this connection cannot show its list family.
2. Follow the `clean-and-export-leads` skill for the correct reader and CSV fields. Local lists, B2B searches and project opportunities use different readers. If the result is still collecting rows, label a partial export clearly.
3. Give the seller the CSV and actual row count. Show whether more rows remain and report any missing evidence or costs. An export from data already in chat needs no Apify run. A hosted read or export may incur platform usage.
