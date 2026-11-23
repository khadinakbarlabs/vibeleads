---
name: session-continuity
description: Resume a known B2B prospecting task from its business brief, partial run or saved lead report without repeating completed work or renewing spending authority. Use for continuing lead research and prospecting handoffs, not generic project continuation.
---

# Session Continuity

Apply the [shared contract](../lead-engine/references/operating-contract.md) and [context protocol](../business-context/references/context-protocol.md).

At session start, read the chosen business brief and latest handoff if available. Check profile identity, date/revision, completed work, current intent and still-relevant user corrections. Say briefly what is being reused and the useful next step. Missing saved files mean recover from current context or request the missing path, not pretend to remember.

Reconcile pending/uncertain run IDs, partial datasets, source coverage and cumulative charges before rerunning collection. A previous report is a baseline, not current evidence of employment/source health or renewed spending. Reuse applicable explicit authorization; never reset it with a new session or week unless its stated allowance actually renews then.

For a saved exact run, the [existing-run reading procedure](../lead-engine/references/local-data-workflow.md#read-an-existing-run) resumes bounded reads from its checkpoint without starting another collection. Keep only the checkpoint path, scope, observed state and next action in the handoff; retained rows remain in the private working dataset. An unknown start stays unassigned until exact permitted readback succeeds ([reconciliation](../lead-engine/references/local-data-workflow.md#unknown-start-reconciliation)).

Resume only missing partitions/fields. Deduplicate at the same account/contact/branch grain, preserve original IDs and richer provider evidence in the companion mapping. For comparisons, distinguish new, retained, changed, not observed and uncertain identity. Missing in a partial session is not lost; independent source/time windows are not automatically comparable.

Finish a meaningful session with a [short handoff](references/session-handoff-template.md): result files, useful counts/coverage, decisions, actual spend/reserved/remaining when known, feedback changes, unresolved questions and one concrete next action. Save it in the established user workspace and check revision before replacing a newer handoff. Keep secrets/transcripts/raw logs out.

Offer a weekly review or relevant refresh only when it helps the business. Creating a recurring task goes through [scheduled-prospecting](../scheduled-prospecting/SKILL.md); writing a suggested cadence into the handoff does not activate it. Deliver [lead-reporting](../lead-reporting/SKILL.md) when a visual/session comparison adds value.
