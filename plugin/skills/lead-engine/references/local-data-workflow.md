# Local data workflow and existing-run reader

Read this for importing a CSV/JSON lead list, mapping a saved dataset, or resuming reads of a known run. Python 3.10+ standard library is sufficient. Resolve the installed `lead-engine/scripts/lead_io.py` path; keep the complete skill tree because quality and reporting resources are shared. These are optional contained helpers, not a server, sender, scheduler or paid collection service.

## Operation choice and first result

| Requested work | Operation | Result and acceptance |
| --- | --- | --- |
| Clean/map a supplied list | `prepare` | Canonical rows, companion IDs/provenance, suppression, quality buckets and private visual/readable reports; every quality row joins its source by `record_id`. |
| Inspect local support | `doctor` | Python/runtime presence only; no login or account request. An executable being present is not verified authentication/argument support. |
| Read an already-created exact run | `read` | Actor/build/dataset readback, bounded unfiltered pages, retained cursor and partial/complete state. No run starts, aborts or resurrections. |
| Resume a partial read | `read` with the same checkpoint | Continue from the retained raw offset with the same run identity and output limit. |
| Reconcile a start timeout | unknown-start checkpoint, then `--adopt-run` | No replay; associate a known run only after exact Actor/build readback. If no matching run can be established, remain unknown. |

No local analysis requires a data key, priced pilot or global tool installation. For `read`, the host must have the independently installed authenticated official CLI with supported `api GET` and `--params`; inspect its current version/help first. Alternatively use a capable existing integration and supply an export to `prepare`. Never install a server, inspect a credential file or print a token for this operation.

## Deliberate mapping

Inspect actual columns and sample rows before selecting fields. JSON pointers (`/company/name`, `/a~1b`, `/items/0`) identify input paths; they do not execute code. CSV values stay strings. Supply reviewed boolean criteria and structured evidence in JSON when qualification needs them; strings such as `"yes"` do not become verified fit. The helper does not synthesize evidence, infer website ownership, verify mailboxes or infer contact consent.

An example mapping (adapt to the actual source):

```json
{
  "source_id": "reviewed-import",
  "grain": "account",
  "fields": {"company": "/name", "domain": "/website", "location": "/city"},
  "provider_id": "/id",
  "details": {"crm_id": "/crm/id", "use_basis": "/use_basis", "consent_state": "/consent_state"},
  "opt_out": "/opt_out"
}
```

Optional `observed_at` is a timezone-aware actual source observation time, not an invented import date. `fields` accepts the canonical record fields, evidence, booleans and disqualifiers; `details` explicitly retains needed richer fields in the companion file. Unknown fields remain in the original import, which is not modified. Review mapped details for unnecessary private information. Credential keys and credential-bearing typed URLs are removed; this is bounded hygiene, not proof that arbitrary free text contains no secrets.

Explicit boolean opt-outs become disqualifiers and appropriate domain/email suppression. Nonboolean opt-out states are held out for review; intentionally convert source-specific meanings before processing if needed. Suppression wins over score. Missing use basis/consent remains unknown. `record_id` is an opaque join key, not verified company identity or permission to send. Duplicate/ambiguous rows remain attributable; conflicting exact-key facts are listed rather than merged. `source_record_locator` refers to the original input and must never be used as a join after sorting/deduplication.

```sh
python3 <lead-engine-directory>/scripts/lead_io.py prepare --input companies.csv --mapping mapping.json --task-id prospect-review-01 --output /chosen/private/workspace/review-01 --suppression suppression.json
```

Omit `--suppression` if none was supplied. The output parent must exist; the named output directory must be new and outside the installed plugin. Existing artifacts are preserved. The result contains `canonical.json`, `companion.json`, `suppression.json`, `quality.json`, `brief.html`, `brief.md` and `brief.json`. Open the finished report through the host's artifact tool and inspect review/exclusion reasons. Coverage for an ordinary import is **NOT_REPORTED**; processing a file does not prove fresh collection or complete source coverage. Summary/error rows are excluded and keep coverage partial until their meaning is reviewed.

## Existing-run checkpoint and recovery

Paid starts stay in the [connection guide](connection-guide.md): verify source/access/contact gates, exact current schema/build, pricing, authorized stage/period allocation and supported `maxTotalChargeUsd`/timeout before the official start command. The reader never calls POST or a convenience start, and count limits never stand in for charge limits.

```sh
python3 <lead-engine-directory>/scripts/lead_io.py read --checkpoint /chosen/private/workspace/run.json --task-id prospect-review-01 --run-id EXACT_RUN_ID --actor-id EXACT_ACTOR_ID --build-id EXACT_BUILD_ID --record-limit 1000 --page-size 100 --max-pages 5
python3 <lead-engine-directory>/scripts/lead_io.py read --checkpoint /chosen/private/workspace/run.json --page-size 100 --max-pages 5
python3 <lead-engine-directory>/scripts/lead_io.py prepare --input /chosen/private/workspace/run.json --from-checkpoint --mapping mapping.json --task-id prospect-review-01 --output /chosen/private/workspace/report-01
```

Replace identifiers with exact verified values, not friendly titles. The private checkpoint is a working dataset bundle with task/run/build/dataset IDs, observed state/count, raw-offset cursor, retained sanitized rows and one next action. Save only its path and compact state in session context, not the rows. File permissions are private and writes atomic; a local lock prevents two instances of this reader sharing one file. This is not a cross-process spending lock or provider idempotency guarantee. Offline reporting checks cursor/row consistency and derives coverage from the recorded terminal state instead of trusting a saved complete label; it does not refresh provider state or authenticate the checkpoint's contents.

At most 25 pages per invocation, 500 rows per page and 10,000 retained rows per checkpoint are supported; lower defaults apply. Requests time out after 25 seconds, responses over 16 MiB are rejected, and retained checkpoints are bounded to 20 MiB before cursor advance. Pages are unfiltered, ascending, without transforms or empty/hidden skipping: advance by raw returned rows, filter diagnostics later. A short/empty page inconsistent with the observed count is partial, not exhausted coverage. Record-limit/page-limit truncation is partial. Running, failed, aborted and timed-out source runs stay partial even if every current row was read. A succeeded run with zero rows is only provisionally empty until source summaries/errors are reviewed. Platform usage is reported separately; Actor/event charges and remaining authorization are not inferred.

For an ambiguous start, create the checkpoint with `--outcome-unknown` and no `--run-id`, keeping known task/Actor/build identity. After permitted readback identifies the exact matching run, use the same file with `--adopt-run --run-id EXACT_RUN_ID`; no start is performed. Failed association preserves the unassigned checkpoint. Denied/rate-limited reads preserve prior pages and pause; they do not trigger proxy, identity or publisher switching. Restore permitted access before resuming. Never guess a recent run from another task or reset the cursor to conceal a conflict.

## Agent-readable result

JSON stdout contains product/helper version, task identity where known, state, stage, actual artifact path/counts/cursor, coverage/verification and one next action. Exit 0 means the local operation produced its stated result; `partial`/`unknown` can still be useful. Exit 2 returns a safe error object; stderr contains only a short code. Help output is human-readable. No raw provider responses, account metadata, contact rows or stack traces are printed.

Codes distinguish `RUNTIME_MISSING`, `PROJECT_MISSING`, `INPUT_MISSING`, `INVALID_INPUT`, `INVALID_PATH`, `INPUT_TOO_LARGE`, `AUTH_REQUIRED`, `ACCESS_DENIED`, `RATE_LIMITED`, `STATE_CONFLICT`, `UNSUPPORTED_CHECKPOINT`, `READ_TIMEOUT`, `REMOTE_READ_FAILED`, `INVALID_RESPONSE`, `RESPONSE_TOO_LARGE`, `CHECKPOINT_TOO_LARGE`, `COVERAGE_GAP` and `OUTCOME_UNKNOWN`. For a lock left after a crash, verify no reader is active before removing only that lock. A partial checkpoint can be analyzed offline. No stored checkpoint renews a budget or activates a schedule.

Primary contracts checked October 5, 2026: [dataset raw paging](https://docs.apify.com/api/v2/dataset-items-get), [official CLI](https://docs.apify.com/cli/docs/reference), [run charge controls](https://docs.apify.com/api/v2/actors-runs-post). Tests use fictional data and a fake transport, not paid source runs.
