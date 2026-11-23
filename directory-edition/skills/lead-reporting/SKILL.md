---
name: lead-reporting
description: Create a private HTML, Markdown or JSON report from saved B2B prospects, compare lead-research sessions or explain list quality and coverage. Use for prospect dashboards and weekly lead reviews; supplied files need no live collection.
---

# Lead Reporting

Apply the [shared contract](../lead-engine/references/operating-contract.md) and [report guide](references/report-guide.md).

Lead with the business result: best prospects, why they fit/why now, completeness and the next action. For a small result, a concise table is enough. For larger/recurring work, create a private interactive brief plus readable Markdown and structured JSON when useful. Default cards show company, score, evidence and uncertainty; minimize exposed contact data and keep full mappings separate.

Use actual canonical input records, observed coverage and attributed actual spend/reserved allowances. Recalculate quality with the [quality rules](../lead-list-quality/references/quality-rules.md) rather than trusting imported scores or `email_sendable` claims. Never equate company counts with email counts, job success with complete source coverage, or score with conversion probability.

For session comparisons, use the same grain/scope and reviewed prior canonical rows. Label new, retained, changed and not observed following the comparison rules in the report guide; missing from partial coverage does not establish disappearance. Rich provider detail/original IDs remain in the companion mapping. Source-domain counts describe evidence coverage, not independent-provider reliability or revenue attribution.

For a file not yet canonical, use the [offline import workflow](../lead-engine/references/local-data-workflow.md) to map actual CSV/JSON fields and create the provenance/quality/report bundle without account onboarding. Keep `companion.json` beside the brief; missing contact-use eligibility stays unknown. Saved partial-run coverage carries into its report.

Build the brief yourself:

1. Validate the optional summary against the report guide's table; ask about anything outside it.
2. Assess quality, compute the metrics and, when a previous snapshot is supplied, the session comparison.
3. Write `brief.md` and `brief.json` in the user's private workspace (new files only unless the user asks to replace; `chmod 600` each).
4. For an interactive view, use the host's artifact tool, or write a fresh self-contained `brief.html` that meets every behaviour and HTML safety rule in the report guide. If neither is possible, say the Markdown is the report; do not call it interactive.

Open/show the finished local report through a supported host artifact tool. Do not claim a queued tab is visible or a Markdown-only output is an interactive report. Review before sharing/exporting: user business information may be sensitive. Saving a requested private artifact is routine; publishing it or sending it externally needs that authorization.
