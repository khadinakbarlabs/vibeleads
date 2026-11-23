---
name: lead-list-quality
description: Import, clean, suppress, deduplicate and prioritize a company or business-contact CSV/JSON list with source IDs and provenance preserved. Use for lead-list hygiene or export review; local file work needs no account or new collection.
---

# Lead List Quality

Apply the [shared operating contract](../lead-engine/references/operating-contract.md) before acting.


Read [record contract](../lead-engine/references/record-contract.md) and prospecting framework. Agree account/contact/branch grain from the request. Inspect actual file structure and deliberately map source fields. Do not assume every source’s `url` is the company website or every email is deliverable.

Normalize domains and exact emails, preserve distinct contacts/branches, apply suppression/disqualifiers, resolve conflicts and check evidence/date coverage. Missing domain/address remains in manual review. Do not deduplicate unrelated businesses by similar names. Do not mix summary/error records into leads.

For supplied CSV/JSON or saved runs, use the [local mapping workflow](../lead-engine/references/local-data-workflow.md) to create canonical rows, companion provenance, suppression and a private report. Record IDs assigned at mapping survive sorting/deduplication. Neither route needs login or a collection allowance.

Apply the [quality rules](references/quality-rules.md) to canonical records: public URL and domain checks, email states, evidence requirements, score, suppression, identity per grain, buckets, deduplication order, conflicts and CSV formula escaping. Apply them the same way every time. Write `quality.json` (buckets with reasons and counts) and, when asked, a CSV; a sendable-only CSV keeps only qualified rows with validator-backed valid emails. Nothing here makes network calls or verifies addresses. For lists above a few hundred rows, follow the size guidance in the quality rules and say plainly that manual processing is less exact than the full edition's deterministic checks.

Preserve required external IDs and provider-specific enrichment/validation detail in a companion mapping, because canonical rows keep only the canonical fields. Join by `record_id` or reviewed stable identity after deduplication, never row position; include that mapping in enrichment/CRM handoffs.

Also preserve contact-use basis, consent provenance where applicable and opt-outs in that mapping. Apply explicit opt-outs through suppression before assessing quality; use disqualifiers if no stable suppression key exists. Technical email-ready/sendable-only results do not evaluate permission to message and must not be presented as a recipient audience. Return unresolved eligibility as unknown alongside quality results.

Review notes/evidence for irrelevant private data before exporting. Escape formula-leading cells in CSV. Write outputs only in the user's private workspace, never over inputs, and `chmod 600` files containing contact data. Report qualified/review/excluded counts, duplicates, suppressed rows, email-quality distribution, scoring rationale and missing fields. Preserve original source files.
