---
name: lead-list-quality
description: Import, clean, suppress, deduplicate and prioritize a company or business-contact CSV/JSON list with source IDs and provenance preserved. Use for lead-list hygiene or export review; local file work needs no account or new collection.
---

# Lead List Quality

Apply the [shared operating contract](../lead-engine/references/operating-contract.md) before acting.


Read [record contract](../lead-engine/references/record-contract.md) and prospecting framework. Agree account/contact/branch grain from the request. Inspect actual file structure and deliberately map source fields. Do not assume every source’s `url` is the company website or every email is deliverable.

Normalize domains and exact emails, preserve distinct contacts/branches, apply suppression/disqualifiers, resolve conflicts and check evidence/date coverage. Missing domain/address remains in manual review. Do not deduplicate unrelated businesses by similar names. Do not mix summary/error records into leads.

For supplied CSV/JSON or saved runs, use the [local mapping workflow](../lead-engine/references/local-data-workflow.md) to create canonical rows, companion provenance, suppression and a private report in one offline operation. Opaque source joins survive sorting/deduplication. Already canonical files can use the smaller helper below. Neither route needs login or a collection allowance.

Use the optional offline helper with canonical records:

```sh
python3 <skill-directory>/scripts/lead_quality.py input.json --grain contact --suppression suppression.json --output report.json --csv leads.csv
```

Inspect help first. Omitting `--csv` writes only JSON; `--sendable-only` restricts CSV to validator-backed valid emails. Python is optional: if unavailable, perform the same checks manually and write equivalent outputs with the host’s tools. The helper makes no network calls and does not verify addresses.

Preserve required external IDs and provider-specific enrichment/validation detail in a companion mapping before the helper drops unsupported fields. Join by reviewed stable identity after deduplication, never row position; include that mapping in enrichment/CRM handoffs.

Also preserve contact-use basis, consent provenance where applicable and opt-outs in that mapping. Apply explicit opt-outs through supported suppression inputs before the helper; use disqualifiers if no stable suppression key exists. Technical email-ready/sendable-only results do not evaluate permission to message and must not be presented as a recipient audience. Return unresolved eligibility as unknown alongside quality results.

Review notes/evidence for irrelevant private data before exporting. Escape formula-leading cells in CSV. Report qualified/review/excluded counts, duplicates, suppressed rows, email-quality distribution, scoring rationale and missing fields. Preserve original source files.
