# Claude host validation — October 6, 2026

Claude Code authentication is now connected through the owner's authorized built-in-browser login. One run per arm of **six scenarios** was completed with and without local VibeLeads 0.3.0. Claude Code version: **2.1.289**. Retained traces identify **claude-opus-5-5** in five case pairs; the first import/report run's model metadata was not retained. Public ID and all 26 skill IDs remain unchanged.

## Actual results

| Case | Plugin native checks | Baseline native checks | Plugin / baseline duration | Interpretation |
| --- | --- | --- | --- | --- |
| import-report | 7/7 | 6/7 | 28 / 46 s | Baseline missed the required opt-out marker; temporary artifacts were cleaned up, so this is grader readback, not semantic exclusion proof. |
| missing-tools | 3/3 | 3/3 | 44 / 23 s | Both produced useful plans without claiming real collected prospects. |
| near-miss | 1/1 | 1/1 | 10 / 14 s | Neither used a VibeLeads skill for the unrelated UI request. |
| partial-state-conflict | 3/4 | 4/4 | 53 / 23 s | Native wording failure; actual response preserves cursor/rows. Corrected lexical rule passes offline on retained output in both arms. |
| planning | 3/3 | 3/3 | 34 / 19 s | Plugin invoked lead-engine; baseline received Unknown skill and supplied a manual plan. |
| unknown-start | 2/2 | 2/2 | 29 / 23 s | Plugin preserved unknown allowance and possible charges. Baseline proposed account limits as the allowance and suggested abort; no provider request was executed. |

Native full-case passes were **5/6 with the plugin and 5/6 without**. These are tiny, deterministic artifact/text checks, not conversion, semantic accuracy or general productivity evidence. The unrelated-task skill-use indicator was also inspected directly in the retained traces; neither arm called a VibeLeads skill. The planning baseline's explicit missing-skill attempt is not a successful plugin invocation.

The checkpoint grader rejected conservative wording twice: first “cursor is unchanged/neither reset nor advanced,” then “Nothing has been started, re-read or reset.” Inspection of the retained final responses and executed commands confirms the cursor wasn't reset, retained rows were protected and no real run was started. The grader now recognizes these negative/passive forms while rejecting unrelated negation such as “No results were retained, so reset the cursor.” Two focused regression tests cover both positive and negative examples. **Offline rescoring of the retained corrected-run responses passes the revised rule in both arms.** Native raw scores remain untouched; no fresh model run after that final lexical repair is claimed.

The import/report grader's difference is a required marker, not proof that the baseline mishandled real opt-outs. Its seven plugin checks establish the requested artifacts existed and selected CRM/unknown-quality/opt-out markers were present during execution. The initial run cleaned up its temporary trace and files. Remaining case traces were retained privately for review; no raw traces, account metadata or contact rows were added to the public package.

## Usage and control limits

The aggregate reported model-cost estimate is **$3.0397058**, including three extra arms from the interrupted suite/retries. This is a local token-price estimate on a Max login, not verified additional invoice spend. The original $0.50 threshold was exceeded by one in-flight run; the later $3 overall stopping threshold was exceeded by about $0.04 on the final paired rerun. The installed evaluator's help explicitly says it checks `--max-cost-usd` before launching each run, so an in-flight run can exceed it. It is **not an exact financial cap**. No further model runs were launched after that final threshold crossing.

With-plugin arms were sometimes slower and used more nominal tokens than baseline because they loaded source/framework context. No overall speed or cost advantage is claimed. Recorded durations are full arm durations, not measured time to first useful artifact. Regex graders don't measure the meaning of company qualification, consent or legal eligibility; manual review adds only the observations documented above. The native `turns` counter should not be treated as a verified strict model-call cap: one arm reported 12 despite configured `max_turns: 8`.

## Local checks and scope

**108/108 local tests pass**, including the two new grader regressions. Runtime package bytes remain unchanged from the tested 0.3.0 bundle. Claude inventory previously verified all 26 skills; these host traces verify actual lead-engine/session-continuity invocation, rather than behavior of every skill. Codex active-conversation discovery and Cursor UI exposure remain separate, unverified checks; this login doesn't resolve those hosts.

No real provider collection, email validation, CRM upload, outreach, schedule activation, directory submission or new public release was tested/performed. Data-account authentication wasn't established by the Claude login. Native tests use fictional task states/records; actual source rights, pricing, charge caps and complete provider billing still require their established live gates.

## Evidence and continuation

Private local summaries/reports are under `exports/vibeleads-v0.3.0`: `host-validation-summary-2026-10-06.json`, the per-case `host-eval-2026-10-06*.json` results, local native HTML reports and `retained-native-traces/`. Paths in exported native results refer to sandbox artifacts, not customer workspaces. The first import/report artifact contents are unavailable; the separate offline import acceptance report remains available and its 106-test helper evidence is unchanged.

Use `--keep-temp` for future artifact review, never execute configuration from kept sandbox folders, and retain only needed fictional outputs privately. Reproduce a case with `claude plugin eval . --eval-dir tests/host-evals --case CASE_NAME --runs 1 --ablation with-without --keep-temp --allow-tools Bash Write Edit --trust-plugin --no-publish --json OUTSIDE_SOURCE/result.json --output-dir OUTSIDE_SOURCE/report`, adding a reviewed nominal threshold with `--max-cost-usd`; account for in-flight overrun. No new recurring job is implied.

The next product check is a separately scoped **live read-only existing-run test** using the user's configured data connection, exact run/Actor/build IDs and permitted retained dataset. This host verification doesn't authorize a new paid collection.

Primary references checked October 6: [Claude evals](https://code.claude.com/docs/en/plugin-evals), [cost estimates and subscription usage](https://code.claude.com/docs/en/costs); the installed native eval help supplies the between-run ceiling behavior.
