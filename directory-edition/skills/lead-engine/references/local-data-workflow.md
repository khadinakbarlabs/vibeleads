# Local data workflow and existing-run reading

Read this for importing a CSV/JSON lead list, mapping a saved dataset, or resuming reads of a known run. In this edition every step is done with the host's ordinary file tools (read, write, edit) plus a few standard shell commands and the official Apify CLI. Nothing here installs software, starts a server, sends messages or starts a paid collection.

## Operation choice and first result

| Requested work | Procedure | Result and acceptance |
| --- | --- | --- |
| Clean/map a supplied list | [Prepare an import](#prepare-an-import) | Canonical rows, companion IDs/provenance, suppression, quality buckets and a private brief; every quality row joins its source by `record_id`. |
| Check local support | [Check the setup](#check-the-setup) | CLI presence and account presence only. A present executable is not verified authentication or flag support. |
| Read an already-created exact run | [Read an existing run](#read-an-existing-run) | Run/Actor/build/dataset readback, bounded unfiltered pages, a retained cursor and a partial/complete state. No run starts, aborts or resurrections. |
| Resume a partial read | Same procedure, same checkpoint | Continue from the retained raw offset with the same run identity and output limit. |
| Reconcile a start timeout | [Unknown-start reconciliation](#unknown-start-reconciliation) | No replay. Attach a run ID only after exact Actor/build/time readback. If no single matching run is found, the outcome stays unknown. |

No local analysis needs a data key, a priced pilot or a global tool install. Reading a run needs the independently installed, authenticated official Apify CLI with `apify api GET ... --params`; check `apify --version` and `apify api --help` first. Where the host already has the vendor-run Apify remote MCP server or another capable official integration, it may stand in for the CLI under the same read-only rules. Otherwise ask the user for an export and prepare it. Never install a server, inspect a credential file or print a token for this work.

## Workspace safety rules

These rules apply to every file this workflow writes.

| Rule | How |
| --- | --- |
| Private location | Use a workspace folder the user chose, outside the installed plugin directory. Never write inside the plugin. |
| New output folder | Create it with `mkdir -m 700 <folder>`. If `mkdir` reports the folder exists, stop: choose a new name or get the user's explicit permission to replace its contents. Never overwrite an input file. |
| Private file permissions | After writing any checkpoint, page, canonical, companion, suppression, quality or brief file, run `chmod 600 <file>`. |
| Whole-file writes | Write to `<name>.tmp` in the same folder, check it, then `mv <name>.tmp <name>`, so a half-written file never replaces a good one. |
| One reader per checkpoint | Before changing a checkpoint, run `mkdir <checkpoint>.lock`. If it fails, another session may own it: stop and report `STATE_CONFLICT`. Remove the lock with `rmdir <checkpoint>.lock` when done. Remove a stale lock only after the user confirms no other session is reading. |
| Size limits | At most 10,000 rows per job and 20 MiB per input or retained checkpoint. Check with `wc -c <file>` and `wc -l <file>` before reading. Over the limit: stop with `INPUT_TOO_LARGE` or `CHECKPOINT_TOO_LARGE` and ask the user to split or filter. |
| No raw rows in chat | Do not print provider rows, account metadata or contact data in replies. Summarise counts and states. |

### Credential scrubbing

Before keeping any provider or import row, drop credential-like fields and URLs. A field is dropped when its **name** matches any of these patterns (case-insensitive; `.` means any single character or none):

| Pattern | Examples it catches |
| --- | --- |
| `api.?key` | `apiKey`, `api_key`, `API-KEY` |
| `access.?token`, `auth.?token`, `refresh.?token` | `accessToken`, `auth_token` |
| `password` | `password`, `smtpPassword` |
| `secret` | `clientSecret`, `secret` |
| `cookie` | `cookie`, `cookies` |
| `authorization` | `Authorization` |
| `credential` | `credentials` |
| `token` or `bearer` as a whole word segment (start, end, or between `_`/`-`) | `token`, `x_token`, `bearer-value` |

A text value that contains an `http(s)://` URL is replaced with `[credential URL removed]` when that URL has a user name or password, or any query parameter whose name matches the patterns above or is exactly `token`, `key`, `signature`, `sig` or `auth`. A URL that cannot be parsed is replaced with `[invalid URL removed]`. Apply this to nested objects and lists too. This is bounded hygiene, not proof that free text contains no secrets; review notes before sharing.

## Check the setup

1. `apify --version` and `apify api --help`: confirm the CLI exists and supports `api GET` with `--params`.
2. `apify info`: confirm an account is logged in, without showing credentials. Never run `apify auth token` or open `~/.apify/auth.json`.
3. If either is missing, say so, keep the plan, and offer the import route.

## Prepare an import

1. **Inspect.** Check size with `wc -c` and `wc -l`. Read the file and show the user its columns and three sample rows (redact contact details in the sample if not needed).
2. **Agree the mapping.** Decide with the user which source path fills each canonical field, which grain applies, and which richer fields to keep in the companion. The mapping can be saved as a small JSON file in the workspace for reuse. Example (adapt to the actual source):

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

   Paths are JSON pointers (`/company/name`; `~1` stands for `/` and `~0` for `~` inside a key; `/items/0` is the first list item). They describe where data is; they do not run anything. Allowed mapping keys: `source_id`, `grain`, `fields`, `provider_id`, `details`, `opt_out`, `observed_at`. `fields` may target only canonical fields plus `fit`, `problem`, `timing`, `disqualifiers` and `evidence`. `details` holds at most 50 entries and its names must not match the credential patterns. Optional `observed_at` is a timezone-aware actual source observation time, not an invented import date. CSV values stay text; `"yes"` never becomes a verified `true`. Do not invent evidence, infer website ownership, verify mailboxes or infer consent.
3. **Set aside diagnostics.** Apply the diagnostic-row rule from the [quality rules](../../lead-list-quality/references/quality-rules.md#diagnostic-and-summary-rows) and count them.
4. **Assign record IDs.** Give every remaining row a `record_id` of `vt_` + task ID + `_` + its original zero-based position padded to six digits, for example `vt_review01_000042`. Assign it once, here, and carry it with the row from then on; never recompute it after sorting or deduplication. Keep any existing `vl_` IDs from the full edition unchanged.
5. **Write the canonical file** (`canonical.json`): a JSON array of canonical rows (see the [record contract](record-contract.md)) with domains normalised, emails lowercased, `fit`/`problem`/`timing` true only when the source value is boolean `true`, usable evidence only, and opt-out effects applied (see the quality rules).
6. **Write the companion file** (`companion.json`): an object with `task_id`, `grain`, a `join` note ("record_id; source_record_locator is attribution, never an output-row join"), a `use_note` ("Missing contact-use/consent state remains unknown. Quality is not permission to message.") and `records` keyed by `record_id`. Each record holds `source_id`, `provider_record_id`, `source_record_locator` (original position), `identity` (the identity key or null), `identity_state` (`exact_key_requires_entity_review` or `ambiguous`), `observed_at`, `opt_out` (the raw value), `details`, `field_sources` (pointer, source and observation time per mapped field), `missing_fields` and `conflicts` (see the quality rules; empty list when none).
7. **Write the suppression file** (`suppression.json`): the user's suppression plus opt-out additions, as sorted `domains` and `emails` arrays.
8. **Assess quality** by applying the [quality rules](../../lead-list-quality/references/quality-rules.md) and write `quality.json` with `grain`, `qualified`, `review`, `excluded` and `counts`.
9. **Write the brief** with the [lead-reporting](../../lead-reporting/SKILL.md) skill: `brief.md` and `brief.json` always, an HTML or host-artifact view when useful.
10. Run `chmod 600` on every file, then report counts, coverage, diagnostics and one next action.

Coverage for an ordinary import is **NOT_REPORTED**: processing a file does not prove fresh collection or complete source coverage. Explicit boolean opt-outs become disqualifiers and suppression; other opt-out values are held for review. Missing use basis or consent stays unknown. `record_id` is a join key, not verified identity or permission to send. Duplicate and ambiguous rows stay attributable; conflicting facts are listed, never merged. The original import is never modified.

## Read an existing run

Paid starts stay in the [connection guide](connection-guide.md): verify source/access/contact gates, exact current schema/build, pricing, authorised stage/period allocation and supported `maxTotalChargeUsd`/timeout before the official start command. Reading never uses POST, `apify call`, `apify actors start`, abort, resurrect or metamorph, and count limits never stand in for charge limits.

**Allowed endpoints (GET only):**

| Endpoint | Purpose |
| --- | --- |
| `actor-runs/<RUN_ID>` | Run state, Actor ID, build ID, default dataset ID, platform usage |
| `datasets/<DATASET_ID>` | Dataset identity and item count |
| `datasets/<DATASET_ID>/items` | Raw pages |
| `acts/<ACTOR_ID>/runs` | Only for unknown-start reconciliation (below) |

Use exact verified IDs (letters, digits, `_` and `-` only, at most 80 characters), never friendly titles.

### Checkpoint file

Keep one checkpoint JSON per run in the workspace (for example `run.json`) and the retained rows in separate page files beside it (`rows-0000.json`, `rows-0001.json`, ...). The checkpoint holds:

| Key | Meaning |
| --- | --- |
| `edition` | `"text"` (a full-edition checkpoint is a different format; do not mix them) |
| `task_id`, `run_id`, `actor_id`, `build_id` | Exact identities; `run_id` is null for an unknown start |
| `record_limit` | The authorised output limit (1 to 10,000; default 1,000). Never raise it during a resume. |
| `dataset_id`, `run_status`, `snapshot_item_count`, `observed_at` | From the latest readback |
| `cursor` | Number of raw rows retained so far |
| `pages` | List of `{file, rows}` entries for the retained page files |
| `state` | `planned`, `unknown`, `partial` or `completed` |
| `coverage` | `NOT_REPORTED`, `PARTIAL`, `COMPLETE` or `VALID_EMPTY` |
| `truncated` | True when the cursor stopped below the dataset count |
| `platform_usage_usd`, `usage_note` | Platform usage only ("not total Actor/event charges or renewed spend authorisation") |
| `start_attempt` | For unknown starts: attempt time, Actor, build, input file name |
| `error`, `next_action` | Last stopping code and one next step |

Save only the checkpoint path and its compact state in session context, not the rows.

### Procedure

1. Take the lock (`mkdir run.json.lock`). Read the checkpoint, or create a new one with `state` `planned`.
2. **Consistency check.** The sum of `rows` in `pages` must equal `cursor`, and `cursor` must not exceed `record_limit`. If not, stop with `STATE_CONFLICT`; never reset the cursor to hide a mismatch.
3. **Run readback.** `apify api GET actor-runs/<RUN_ID> > run-info.json` then `chmod 600 run-info.json`. Read only `id`, `actId`, `buildId`, `status`, `defaultDatasetId` and `usageTotalUsd`; do not display the rest. The run ID, Actor ID and (when saved) build ID must match the checkpoint, and the dataset ID must match any saved one; otherwise stop with `STATE_CONFLICT`. Status must be one of `READY`, `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMING-OUT`, `TIMED-OUT`, `ABORTING`, `ABORTED`.
4. **Dataset readback.** `apify api GET datasets/<DATASET_ID> > dataset-info.json`, `chmod 600`. Use `id` (must match) and `itemCount`. If the count is missing or smaller than the cursor, stop with `STATE_CONFLICT`. Save these values to the checkpoint (`state` `partial`, `coverage` `PARTIAL`) before reading pages.
5. **Page loop** (at most 25 pages per session turn; page size 1 to 500, default 100). For each page:
   - `take` = the smaller of page size, `itemCount − cursor`, and `record_limit − cursor`. Stop the loop when `take` is 0.
   - Download straight to a private file so raw rows never enter the transcript:
     `(umask 077; apify api GET datasets/<DATASET_ID>/items --params '{"format":"json","offset":<cursor>,"limit":<take>,"desc":false,"clean":false,"skipHidden":false,"skipEmpty":false}' > page-raw.json)`
     Run it with a Bash timeout of about 30 seconds. A timeout is `READ_TIMEOUT`: keep the checkpoint and resume later.
   - `wc -c page-raw.json`: over 16 MiB is `RESPONSE_TOO_LARGE`; resume with a smaller page size.
   - Read the file. It must be a JSON list of objects with no more than `take` entries, else `INVALID_RESPONSE` (do not advance). An empty list while the count says more rows exist is `COVERAGE_GAP` (do not advance).
   - Apply credential scrubbing, write the result as the next `rows-NNNN.json` (whole-file write, `chmod 600`), and remove `page-raw.json`.
   - Advance `cursor` by the **raw** number of rows returned (filter diagnostics later, never before counting), append to `pages`, and save the checkpoint before the next request.
   - If the retained page files together would exceed 20 MiB, stop with `CHECKPOINT_TOO_LARGE`: analyse what is retained, and choose a smaller bounded read in a new workspace without restarting collection.
6. **Final state.** `truncated` = cursor below the dataset count. The read is `completed` only when the run status is `SUCCEEDED` and nothing was truncated; coverage is then `COMPLETE`, or `VALID_EMPTY` when the dataset has zero rows (still provisional until source summaries and errors are reviewed). Every other case is `partial` with coverage `PARTIAL`: running, failed, aborted and timed-out runs stay partial even if every current row was read, and a short page is partial, not exhausted coverage.
7. Set `next_action`: "Map the retained rows and inspect source diagnostics" (completed); "Reconcile failed source coverage; preserve rows and charges" (failed, aborted, timed out); otherwise "Resume this existing run; keep the original output limit and spending authority". Save, `chmod 600`, release the lock.
8. To report, concatenate the rows from the page files (in order) and follow [Prepare an import](#prepare-an-import), carrying over the checkpoint's coverage. Add the run, Actor, build and dataset IDs, status, cursor, count, observation time and platform usage to the companion under `execution`.

### Errors while reading

| CLI message mentions | Code | Response |
| --- | --- | --- |
| 401, not logged in, not authenticated | `AUTH_REQUIRED` | Pause. Ask the user to log in through the official flow; resume from the checkpoint. |
| 403 | `ACCESS_DENIED` | Pause. Do not switch proxy, identity or publisher. Restore permitted access first. |
| 429 | `RATE_LIMITED` | Pause; resume later from the checkpoint. No rapid retries. |
| anything else | `REMOTE_READ_FAILED` | Keep prior pages; report and pause. |

Record the code in the checkpoint's `error`. Earlier pages are never discarded. A stored checkpoint never renews a budget or activates a schedule.

## Unknown-start reconciliation

Use this when a paid start command timed out or failed in a way that may have created a run anyway.

1. **Do not start again.** Never repeat the start automatically.
2. Create a checkpoint with `run_id` null, `state` `unknown`, the exact `task_id`, `actor_id`, `build_id` (if chosen) and a `start_attempt` entry holding the attempt time (timezone-aware) and the input file name. `chmod 600` it.
3. Read back recent runs of that exact Actor, newest first, to a private file: `(umask 077; apify api GET acts/<ACTOR_ID>/runs --params '{"desc":true,"limit":10}' > recent-runs.json)`. Use only each run's `id`, `actId`, `buildId`, `status` and `startedAt`.
4. A run matches only if its Actor matches, its build matches (when a build was chosen), and it started within a few minutes after the attempt time. If the input must be confirmed, read that run's input record (`apify api GET key-value-stores/<defaultKeyValueStoreId>/records/INPUT > run-input.json`, `chmod 600`) and compare it with the input file.
5. **Exactly one match:** set `run_id` to it (this is "adopting" the run) and continue with [Read an existing run](#read-an-existing-run); the first readback must confirm Actor and build before anything else is saved. **No match or several matches:** leave the checkpoint unknown, tell the user, and ask before any new start. Never pick a recent run from another task.

A failed adoption keeps the unassigned checkpoint. Charges from an unknown start stay reserved until reconciled; they are never treated as zero.

## Agent-readable result

End each operation with a short structured summary: task ID, state (`completed`, `partial`, `unknown`, `blocked`), stage, artifact paths, counts, cursor, coverage, any error code, and one next action. Stopping codes: `RUNTIME_MISSING`, `PROJECT_MISSING`, `INPUT_MISSING`, `INVALID_INPUT`, `INVALID_PATH`, `INPUT_TOO_LARGE`, `AUTH_REQUIRED`, `ACCESS_DENIED`, `RATE_LIMITED`, `STATE_CONFLICT`, `UNSUPPORTED_CHECKPOINT`, `READ_TIMEOUT`, `REMOTE_READ_FAILED`, `INVALID_RESPONSE`, `RESPONSE_TOO_LARGE`, `CHECKPOINT_TOO_LARGE`, `COVERAGE_GAP` and `OUTCOME_UNKNOWN`. A partial checkpoint can still be analysed.

Primary contracts checked October 5, 2026: [dataset raw paging](https://docs.apify.com/api/v2/dataset-items-get), [official CLI](https://docs.apify.com/cli/docs/reference), [run charge controls](https://docs.apify.com/api/v2/actors-runs-post).
