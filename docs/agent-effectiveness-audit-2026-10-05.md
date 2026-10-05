# Agent effectiveness audit — October 5, 2026

> Update October 6: CLI login is resolved and all six host case pairs have run. See [current host verification](host-validation-2026-10-06.md) for native scores, grader repair, usage limits and remaining integration checks. The original October 5 observations below remain historical evidence.

## Outcome and scope

Local revision **0.3.0** retains one skills-only plugin, the public `vibeleads-b2b` identifier, 26 skill IDs, Momentum identity and established company-first/source/contact/spending policies. It adds contained Python helpers for deliberate imports and read-only existing-run reconciliation. No dedicated agents, MCP servers, hooks, hosted persistence, sender or scheduler were added.

Canonical source is `/Users/khadinakbar/ChatGPT Plugins/vibeleads`; installable source is `plugin/`. The separate `/Users/khadinakbar/vibeleads` web app was not changed. Baseline HEAD was `3cacb2087fc7bba8e4953ea6f0a1a53be3bbd142`, with a clean working tree, package version 0.2.5 and 76 passing tests. This audit is local implementation and installation evidence, not a v0.3.0 public or directory release.

## Findings verified against baseline

| Gap | Source evidence | Implemented improvement |
| --- | --- | --- |
| Large opening load for focused requests | `lead-engine` unconditionally requested four references totaling 22,974 characters. | Task-first entry routing; imports/plans use their focused guide, while live starts still require all access/contact/spend gates. Character count is a structural observation, not measured token/latency savings. |
| Manual data handling | Existing helpers expected canonical JSON; provider mapping, raw pagination and durable recovery required improvised glue. | Offline CSV/JSON mapping plus a bounded read-only adapter, private checkpoints and structured safe errors. |
| Attribution lost through quality processing | Unknown fields were dropped; original provider/CRM IDs needed an unimplemented companion mapping. | Opaque `record_id` retained through quality/CSV output; selected provider/CRM/use-state fields and field pointers retained in keyed companion records. Original row position is attribution only. |
| Broad resume/report triggers | Resume descriptions could match generic work; file analysis could be routed through connection/ICP onboarding. | Domain-specific resume/report descriptions and explicit supplied-list, enrichment, planning and recovery routes. Automatic discovery policy and public IDs preserved. |
| Missing local editions | Initial Claude/Codex/Cursor inventories contained no matching installed VibeLeads edition. | Native local marketplace registrations for Claude/Codex; complete Cursor local copy. Current registry exposure and session reload requirements are distinguished below. |

Source/catalog coverage remains 152 preferred routes across 14 detailed families, with 149 inspected metadata/default schemas and three recorded gaps. This audit did not refresh every live provider, certify source rights or run new provider canaries. Names such as Apollo/ZoomInfo still require actual permitted availability, not inference from similarly named Actors.

## Execution and completion contract

`lead-engine/scripts/lead_io.py` provides `doctor`, `prepare` and `read`. Standard-library Python 3.10+ supports local imports. Live reads additionally require the user's independently installed authenticated official CLI; nothing installs or configures it automatically.

`prepare` creates seven private artifacts in a new output directory: canonical rows, keyed provenance companion, suppression, quality JSON and HTML/Markdown/JSON briefs. It leaves original imports and existing outputs intact. Booleans/evidence are not invented from CSV strings. Explicit opt-outs are excluded; unknown use basis remains unknown. Exact-key conflicts and ambiguous identities are retained for review. Quality IDs are not business identities, consent or fresh facts; report comparisons exclude them from business-change detection.

`read` accepts exact existing run/Actor/build identities and allows only three GET endpoint shapes. Argument arrays avoid shell interpolation. Each invocation is bounded to 25 pages, 500 rows/page, 10,000 retained rows, 25-second requests, 16 MiB responses and 20 MiB checkpoints. Unfiltered ascending raw pages advance an exact cursor only after accepted data; each page is persisted before another request. A lock prevents concurrent readers of one checkpoint. Denied/failed reads preserve prior pages. Failed/running/truncated sources remain partial. Offline reporting validates cursor consistency and derives coverage from recorded terminal state; it does not authenticate a local checkpoint or refresh provider observations.

Unknown starts require exact permitted readback and explicit run adoption. A mismatched Actor/build preserves the unassigned checkpoint; no guessed run or automatic start replay is performed. Financial controls remain in the verified paid-start workflow. Platform usage is explicitly separate from total Actor/event charges and does not renew authority. No hidden retry, denied-source publisher switch, contact harvesting, mailbox probing, sending or schedule activation was introduced.

The result contract distinguishes local completion, partial data, blocked access, unknown outcome and safe error codes. It reports task identity, artifact/cursor/counts, coverage, verification level and one next action. Raw provider errors, account metadata and records are not printed. Private output uses restrictive permissions and atomic JSON writes. Credential-key/typed-URL scrubbing is bounded hygiene, not a guarantee for arbitrary free text.

## Verification performed

| Check | Status | Observed result |
| --- | --- | --- |
| Baseline unit suite | Passed | 76/76 before edits. |
| Final unit/integration suite | Passed | 106/106; 30 new task-level tests cover mapping/CRM joins, opt-outs, diagnostics, CSV, unknown quality, paging/resume, identity conflicts, denied partial reads, unknown adoption, malformed state, output bounds and safe errors. Provider transport is fictional. |
| First useful artifact | Passed | Actual offline import of three fictional clinic records produced seven files: 0 qualified, 1 review, 2 excluded (opt-out and duplicate). Coverage correctly NOT_REPORTED. No login, key or network collection was needed. |
| Package boundary, schemas and static secret scan | Passed | 26 skills, 266 installable files; OpenAI/portable and Cursor schemas, limits, links, access/contact markers and credential patterns checked. Static checks do not certify policy acceptance or arbitrary secret absence. |
| Skill Creator validation | Passed | 26/26 frontmatter/naming checks. |
| Native Claude manifest validation | Passed | Runtime and root marketplace validators pass on Claude Code 2.1.289. |
| Archive extraction | Passed | Both ZIP layouts extract, validate and byte-match all 266 source files. SHA-256 values are in external `archive-report.json`. |
| Local install byte comparison | Passed | All 266 source files match Codex cache and Cursor copy; both contain 26 skills at 0.3.0. Claude's local edition reads the source directory directly. |
| Focused code/security review | Passed within scope | Endpoint/input bounds, shell avoidance, error redaction, private paths, checkpoint preservation, identity joins and HTML reuse reviewed and regression-checked in this session. No new independent reviewer was used. |
| New visual interaction pass | Not run | Existing report rendering/security tests pass; this audit generated the actual brief but did not repeat native browser interactions. Historical browser evidence applies to the earlier report revision. |
| Claude with/without behavior comparison | Blocked | Authentication failed immediately: “Not logged in.” One arm attempted, 0 completed outcomes, 0 baseline runs; reported cost $0. No selection/completion rate or improvement claim can be calculated. |
| Codex native discovery conversation | Blocked | One ephemeral read-only attempt timed out after 90 seconds without a final model answer. Startup reported unrelated host/plugin warnings. Registry enabled status does not establish active conversation discovery. |
| Live provider collection, email deliverability, real recurring outcome | Not run | No paid starts, real mailbox validation, outreach, CRM upload or schedule activation. |
| v0.3.0 vendor upload/scan/review/publication | Not run | Local packages are prepared; directory state was not changed or reread during this audit. |

Python observed: 3.13.14. CLI observed: Apify 1.8.0, Claude Code 2.1.289, Codex 0.146.0. Installed Apify help/endpoint descriptions confirm `api GET`, JSON `--params`, run and dataset read operations; convenience starts are not treated as financially capped. The doctor checks executable presence only. Cursor application metadata reports 3.23.12; no Cursor agent executable or completed conversation was observed. Claude model was not observed because authentication stopped execution. Codex startup referred to configured `gpt-6.1-sol`; no completed model response was observed.

Six native Claude cases are prepared in `tests/host-evals`: explicit planning, natural import/report, unknown-start recovery, unrelated UI near miss, missing tools and conflicting partial state. The first import/report attempt stopped at authentication before the other cases could run; the last two cases were added after that attempt. Graders check named artifacts, selected details and tool usage, not semantic qualification or legal judgments. Unit tests separately exercise invalid/partial/missing-state behavior. Native correct-selection rate, unnecessary-question rate, completed outcome rate, first-result latency, model cost comparisons and baseline uplift remain unmeasured.

## Current local hosts

| Host | Installation evidence | Reload and behavioral evidence |
| --- | --- | --- |
| Claude Code | `vibeleads-b2b@vibeleads-local` 0.3.0 installed at user scope; `plugin details` lists all 26 skills, 0 agents/hooks/MCP/LSP. Local source read directly. | New session or `/reload-plugins` required for active sessions. Behavior comparison blocked by CLI login. |
| Codex | Same local marketplace plugin installed/enabled at 0.3.0; cache under `~/.codex/plugins/cache/vibeleads-local/vibeleads-b2b/0.3.0` matches source. Native `.agents/plugins/marketplace.json` points to `./plugin`. | Restart/reload session, then verify discovered skills. Bounded conversation attempt timed out; active-session exposure is unverified. |
| Cursor | Complete source-matching 0.3.0 copy under `~/.cursor/plugins/local/vibeleads-b2b`, including both platform manifests and shared resources. | Reload window and verify 26 skills in Customize. Actual enabled UI state and conversation behavior not observed. No same-name edition was found in the initial inventory. |
| Claude Cowork/chat, ChatGPT cloud, other skill hosts | Portable package/resources retained. | Not run; local dependencies or credentials do not automatically exist in a cloud environment. |

## Reproduce and continue

Local checks: `python3 -m unittest discover -s tests -q`, `python3 scripts/validate_package.py`, `claude plugin validate plugin`, `claude plugin validate .`, then `python3 scripts/package_release.py --output /chosen/private/export-directory` outside source.

After signing in to Claude Code, rerun the prepared bounded comparison from the repository:

```sh
claude plugin eval . --eval-dir tests/host-evals --runs 1 --ablation with-without --max-cost-usd 0.5 --allow-tools Bash Write Edit --trust-plugin --no-publish --keep-temp --json /chosen/private/export-directory/host-eval.json --output-dir /chosen/private/export-directory/host-eval
```

This command may use model capacity up to its nominal stopping threshold plus in-flight overrun; the cases authorize only fictional/offline work. Do not count an authentication failure as a failed plugin case. Review actual artifacts, selection and conversation behavior after successful completion. Separately reload Codex/Cursor and verify native exposure. That October 5 next action was completed on October 6; [current host verification](host-validation-2026-10-06.md) records the six case pairs and current next step.

Last recorded public release remains GitHub/Claude v0.2.5; OpenAI's v0.2.5 draft required human attestations at the prior read. Those are historical session observations, not fresh portal verification. This local revision does not replace a directory draft or change developer attestations.

Primary requirements checked this session: [OpenAI plugin build/install](https://developers.openai.com/plugins/build/plugins), [Claude plugin loading](https://code.claude.com/docs/en/plugins), [Claude evals](https://code.claude.com/docs/en/plugin-evals), [Cursor plugins](https://cursor.com/docs/plugins), [raw dataset paging](https://docs.apify.com/api/v2/dataset-items-get), [run charge controls](https://docs.apify.com/api/v2/actors-runs-post).


The nominal model-cost threshold above is checked between runs, not enforced exactly in flight. Account for possible overrun before using it as a budget control; see the October 6 verification.
