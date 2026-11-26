---
description: Export a saved lead list as a CSV for Google Sheets or Excel (free)
argument-hint: "[which list] [clean first: yes or no]"
---

# Export leads

Request: $ARGUMENTS

1. Read the `vibeleads-core` skill, then follow the `clean-and-export-leads` skill.
2. Find the list. If no list is known in this chat, show the user's saved lists and let them pick.
3. If the user asked to clean first, flag duplicates (free) and report the counts.
4. Export the list and give the user the CSV with its file name.

Exporting is free. Do this work with the VibeLeads tool; it covers every step.
