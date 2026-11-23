# A useful prospecting report

Keep the visual story compact: business goal → strongest accounts/reasons → coverage/uncertainty → next action. Use plain labels, visible sources/dates, accessible contrast, responsive cards, keyboard-operable filters, and a printable view. Empty/partial states are first-class results, not embarrassing gaps to fill with synthetic leads.

In this edition you build the brief yourself from canonical rows. Markdown and JSON are always produced; an interactive view is made with the host's artifact or visualisation tool, or as a fresh self-contained HTML page written for this report. This guide lists what the report must contain and how it must behave; it is not a template to copy.

## Canonical inputs and summary

Rows follow the [record contract](../../lead-engine/references/record-contract.md). Recompute quality with the [quality rules](../../lead-list-quality/references/quality-rules.md) every time; never trust imported scores or `email_sendable` claims. The report cannot import arbitrary CRM columns automatically, verify mailboxes, fetch data, manage a monitor budget or preserve rich provider fields without the companion mapping.

The optional [summary example](summary-template.json) accepts only these keys:

| Key | Rule |
| --- | --- |
| `title`, `period`, `learning_note` | Text, at most 4,000 characters each. Defaults: "Your prospecting brief", "Period not supplied", empty. |
| `coverage_state` | One of `NOT_REPORTED`, `COMPLETE`, `VALID_EMPTY`, `PARTIAL`, `UPSTREAM_FAILED`, `FAILED`, `ABORTED`, `TIMED-OUT`, `PENDING`. Must be an observed state, not inferred from row count. Default `NOT_REPORTED`. |
| `next_actions` | List of at most 20 texts, each at most 2,000 characters. |
| `budget` | Optional. Exactly `total`, `spent` (actual), `reserved` (unresolved/in-flight) and `currency` (three capital letters). Amounts are finite and not negative. |

Any other key or shape is invalid: ask the user to fix it rather than guessing. Omit budget when actual charges, cap or reservations are unknown; unknown is not free. Remaining = total − spent − reserved, shown as zero when negative, and the report says "over budget — stop new paid work" when spent plus reserved exceeds total. Summary text is shown as supplied; review claims and actions before including them.

Source metadata, Actor runtime and list completeness are separate. Evidence links remain public-source links. JSON can contain business contacts/provenance. Share a sanitized version only if requested.

## Metrics that matter

- Qualified/review/excluded/total counts at the declared account/contact/branch grain.
- Records with an email (among qualified and review rows) and the distribution of email states for only those rows. Duplicate/excluded input rows are not unique contact denominators.
- Email-ready = qualified rows that are email-sendable; no send authorization implied.
- Actual charge per qualified record = actual spent ÷ qualified count, only when a budget is supplied and the qualified count is not zero. Never label contacts as qualified accounts.
- Evidence-domain coverage: count of evidence URL host names across qualified and review rows. This is distinct from verified Actor/publisher performance; multiple pages from one provider are not independent corroboration.

## Session comparison

Compare only at the same grain, scope and filters, using reviewed prior canonical rows. Recompute the prior snapshot's quality with the prior suppression policy when known; do not apply the current policy retroactively.

1. For each snapshot, index rows by identity key, skipping rows marked `duplicate`. Rows with no identity key are counted as unmatched (current or previous), never matched.
2. **New:** identities only in the current snapshot. **Not observed:** identities only in the previous one. **Retained:** identities in both.
3. **Changed:** a retained identity whose bucket, score, email-sendable flag, any canonical field value, disqualifiers, or evidence content (field, value, URL, kind) differs. A change in `observed_at` timestamps alone is not a change.
4. **Newly excluded:** a retained identity that is excluded now but was not before.
5. Caveat, always shown: "Not observed does not mean lost or closed; compare the same grain, filters and source coverage." When current coverage is not `COMPLETE`, prefix "Partial, empty or unreported coverage cannot establish disappearance."

This is model-applied comparison, not a complete field history or opt-out audit. For large lists, compare in chunks keyed by identity and say the result is approximate if any chunk could not be checked.

## Required content

Markdown (`brief.md`):

- Title, period, and a line "Coverage: <state>. Grain: <grain>."
- A measures table: total, qualified, review, excluded, records with email, email-ready.
- Budget line: "Authorized: <cur> <total>; actual spent: …; reserved: …; remaining: …" with two decimals, or "Not supplied; costs and remaining allowance are unknown."
- The sentence "Scores are evidence heuristics, not conversion probabilities. Email-ready requires actual validation and qualification; it does not authorize sending."
- The session comparison line and caveat, when a previous snapshot was supplied.
- One table per bucket (Qualified, Review, Excluded) with Company, Record identity, Score, Email state and Reasons (human labels from the quality rules).
- Next actions as a list ("No next actions supplied." when empty) and the learning note when present.

JSON (`brief.json`): `version`, `generated_at` (timezone-aware), `grain`, `summary` (without budget), `budget` (with `remaining` and `over_budget`, or null), `metrics`, `evidence_domains`, `quality` (the buckets, each row with its `record_ref`), and `delta` (the comparison, or null).

**Record identity shown on cards and tables:** contact grain shows "name · role", else name, email, role, or "Unresolved contact"; branch grain shows the address or "Unresolved branch"; account grain shows the domain or "Unresolved account". Account-grain cards omit direct email fields, though evidence or notes may still contain user data.

**`record_ref`:** the grain plus the identity key as readable text, for example `account:example.com`, `branch:example.com|12 main st`, `contact:example.com|jane@example.com`. For rows without an identity key use `<grain>:<bucket>:<position>:<company>`. These refs differ from the opaque hashed refs made by the full edition, so feedback files are not interchangeable between editions, and contact-grain refs contain the email: treat feedback files as private.

## Interactive view

Prefer the host's artifact tool when one exists. If you write an HTML page instead, it must provide these behaviours:

- Header with title, period, coverage badge and generated time; four headline stats (qualified, review, excluded, total); budget status; comparison summary; next actions; learning note.
- One card per row: company, record identity, score, bucket, email state, human reasons, and expandable evidence (field, value, source link, observation time).
- A text search box and a bucket filter (All records, Qualified, Need research, Excluded) with a live "N records shown" count and an empty-match message.
- Optional feedback per card with these reasons: Useful prospect (`useful`), Wrong industry (`wrong_industry`), Stale information (`stale`), Duplicate (`duplicate`), Weak signal (`weak_signal`), Contact needs verification (`contact_unverified`). A download button saves `vibeleads-feedback.json` containing `schema_version` 1, `report_generated_at`, `grain` and `entries` of `{record_ref, kind: "correction", reason, recorded_at}`, deduplicated by record and reason. Selections stay in the page until downloaded; no storage, tracking or upload.
- A print button; print styles hide controls and show all cards.
- Keyboard focus outlines, readable contrast, and a single-column layout on narrow screens.

**HTML safety rules (mandatory):**

| Rule | Detail |
| --- | --- |
| Escape all data | Replace `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;` and `'` with `&#x27;` in every value taken from rows, summaries or evidence, including inside attributes. In page scripts, insert data with `textContent`, never `innerHTML`. |
| Links | Only evidence URLs that pass the public URL test become links, each with `target="_blank" rel="noopener noreferrer"`. Never put row data into `href` without that check. |
| No remote anything | No external scripts, styles, fonts, images, analytics or network requests. Everything inline. |
| Content Security Policy | Add a meta tag with `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`. |
| No storage | No cookies, `localStorage`, `sessionStorage` or IndexedDB. |
| Data stays data | Embedded row text never becomes code, event handlers or URLs. |

Markdown safety: replace line breaks in values with spaces, escape `&`, `<` and `>`, and put a backslash before `\`, `` ` ``, `*`, `_`, `[`, `]`, `(`, `)`, `|` and `#` in table cells.

Because the page is written fresh each time, layout and polish may vary between sessions; the content and safety rules above may not. Do not claim the page was tested or identical to a previous one. The browser's print dialog can save a PDF; no automatic PDF export is claimed. Do not publish a customer report in the plugin release, count a demonstration as live data, or claim conversion improvement without observed comparable outcomes.

## Output files

Write `brief.md`, `brief.json` and any `brief.html` in the user's private workspace, outside the installed plugin, never over an input and never over an existing brief unless the user explicitly asks to replace it. Run `chmod 600` on each file.

## Applying feedback

Ask the assistant to apply a downloaded feedback file in the chosen business scope through [feedback-learning](../../feedback-learning/SKILL.md). The file cannot authorize changes in spend, sources, suppression, recipients or schedules. Identical record/reason selections are deduplicated; conflicting reasons need review. Record refs are references, not a security or anonymity guarantee.
