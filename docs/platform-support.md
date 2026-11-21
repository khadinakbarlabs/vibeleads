# Platform support

One repository contains the shared `skills/` tree and target-specific metadata. Platform manifests do not provide tools by themselves.

| Surface | Package contract | Execution dependency | Evidence |
| --- | --- | --- | --- |
| Claude Code | `.claude-plugin/plugin.json`, skills, optional local marketplace | Host tools and user’s authenticated data access | Local 0.3.0 installed; native inventory lists 26 skills and validators pass. Six 0.3.0 case pairs completed October 6; see host validation for native grades and offline grader correction. Earlier source-directory scenarios remain separate evidence. |
| Claude Cowork | Shared skills and compatible plugin metadata | Actual executable/network/filesystem access in that environment | Not tested; imports/planning remain supported instructions. |
| Claude chat | Skills where supported | A local CLI is not available merely by installing skills | Live collection not asserted. |
| OpenAI/Codex | `.codex-plugin/plugin.json` (OpenAI listing interface), shared skills via the local marketplace; the root Agent Plugins manifest was removed in 0.3.1 (Claude directory cleanup) | Suitable host tool access | Local 0.3.0 installed/enabled and cache byte-matches source. Fresh conversation discovery timed out; reload and active-session verification remain required. |
| ChatGPT web/mobile | Target’s actual plugin/skill capability | Existing capable tool; no bundled service | Local CLI execution not asserted. |
| Cursor | `.cursor-plugin/plugin.json`, shared skills | Host shell/tools and user account | Local 0.3.0 copy byte-matches source and schema passes. Window reload/Customize exposure and actual behavior remain unverified. |
| Other Agent Skills hosts | Whole shared `skills/` tree | Supported resource links and tools | Portable content; host behavior untested. |

Claude documentation: [manifest](https://code.claude.com/docs/en/plugins-reference), [security](https://code.claude.com/docs/en/plugins/security). OpenAI: [packaging](https://developers.openai.com/plugins/build/plugins), [submission](https://developers.openai.com/plugins/deploy/submission). Cursor: [official specification](https://github.com/cursor/plugins). Checked October 5, 2026.

Recurring-work guidance uses each host’s supported scheduler only when available. No real scheduled task was activated or tested in 0.2.0. Context/report files must be reachable from the chosen execution environment; local paths/login do not automatically carry into a cloud run. The attempted 0.2.0 native Claude conversation was blocked by the account usage limit; native manifest validation and independent scenarios passed.

Before release, refresh platform rules, load the final archive in each intended host, check discovered skills and behavior, and complete each vendor’s actual submission requirements. The same source repository can serve all destinations; vendor portals may require different ZIP layouts and listing fields.

Release 0.2.1 adds directory support/privacy/terms/documentation metadata. The current Claude Code validator loads the plugin but warns that these four directory-specific metadata fields are unknown; strict mode treats those metadata-only warnings as errors. The directory portal explicitly requests those fields. Runtime skills are unchanged from 0.2.0.

Revision 0.2.2 uses `plugin/` as the installable and submitted folder, with the single shared skill tree. Tests, maintainer scripts, submission documents and the fictional marketing screenshot remain at repository level. Root marketplace source is `./plugin`. Internal identifier `vibeleads-b2b` replaces the earlier `vibeleads`; the display brand is unchanged. Official Anthropic docs accept directory URL metadata on Claude Code v2.1.281+, so older warnings are a validator-version limitation.

Recorded 0.2.2 check: updated official Claude Code v2.1.289 accepts the directory metadata; strict runtime and marketplace checks pass. Live directory scan at c249d37 has zero policy holds and only four listing-field notices explicitly marked no action needed. That scan observation preceded the subsequently recorded 0.2.5 publication; see the submission handoff for historical directory state.


## Local 0.3.0 audit

Claude Code 2.1.289, Codex 0.146.0 and Cursor app 3.23.12 were inspected. Source, Codex cache and Cursor copy contain the same 266 installable files, 26 skills and complete helper/reference tree. Claude uses the source directory directly. OpenAI local marketplace metadata is in `.agents/plugins/marketplace.json`.

Start a new Claude session or use `/reload-plugins`, reload Codex, and reload Cursor's window to verify new-session skill exposure. Claude login is resolved and six model comparisons ran; Codex's earlier bounded discovery conversation timed out. Cursor UI loading was not observed. No cloud host, live collection or recurring job was tested. Local installation, active exposure, useful model behavior, provider readback and directory approval are distinct evidence states. See [audit details](agent-effectiveness-audit-2026-10-05.md).


October 6: [native Claude verification](host-validation-2026-10-06.md) records actual invocation of lead-engine/session-continuity and the unrelated-task near miss. All 26 remain inventoried; not every skill was behavior-tested. Native package bytes remain 0.3.0.
