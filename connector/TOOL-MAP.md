# VibeLeads tool map

Request type → skill → VibeLeads tool and arguments → which of the owner's Actors does the work.

Every call goes to the one VibeLeads tool (`khadinakbar--vibeleads`) with input `{ "tool": "<name>", "arguments": { ... } }`. VibeLeads itself starts only Actors from its own fixed list, all owned by the same developer. The assistant never starts any of them directly.

| The user asks for | Skill | VibeLeads tool and main arguments | Work done by |
|---|---|---|---|
| "What can you do?", saved lists | vibeleads-core | `start` | VibeLeads itself |
| Any business type in a city | find-local-leads | `plan_leads` then `find_leads`: `niche`, `location` or `locations`, `count`, `onlyWithEmail`, `minScore`, `minRating`, `maxRating`, `minReviews`, `maxReviews`, `websiteStatus`, `priority`, `listName`, `approved`, `maxSpendUsd` | khadinakbar/google-maps-leads-scraper, khadinakbar/email-address-validator, khadinakbar/website-uptime-monitor |
| No website, slow or broken site | no-website-or-slow-site-leads | Playbook `no-website-finder`, `slow-website-finder` or `website-redesign-pitch`; or `plan_leads` then `find_leads` with `websiteStatus` (none, has, none_or_down); or `get_leads` with `onlyWithProblem` | Same three as above; speed playbooks add khadinakbar/google-pagespeed-insights and khadinakbar/bulk-whois-lookup |
| Real phone speed test | website-speed-check | `analyze_website`: `listId`, `checks` speed and domain, `topN`, `approved`, `maxSpendUsd` | khadinakbar/google-pagespeed-insights, khadinakbar/bulk-whois-lookup |
| Weak SEO, SEO audit | weak-seo-leads, seo-audit | Playbook `weak-seo-pitch`; or `analyze_website`: `checks` seo (top 10 sites) | khadinakbar/complete-seo-audit |
| Weak email setup (grade A to F) | tech-stack-and-email-setup-pitch | Playbook `email-setup-pitch`; or `analyze_website`: `checks` emailsetup; or step `check_email_setup` in a workflow | khadinakbar/email-health-sales-signals |
| Old or missing website technology | tech-stack-and-email-setup-pitch | Playbook `outdated-tech-pitch`; or `analyze_website`: `checks` tech; or step `detect_tech_stack` in a workflow | khadinakbar/website-tech-stack-sales-signals |
| Website changes (new page, price, hiring, redesign) | tech-stack-and-email-setup-pitch | `analyze_website`: `checks` watch plus `watchlist`; or step `watch_site_changes` with option `watchlist` in a workflow. First run saves a starting point; changes show on later runs with the same name | khadinakbar/website-change-triggers |
| Broken links | seo-audit | `analyze_website`: `checks` links (top 10 sites) | khadinakbar/broken-link-checker |
| Social media presence | social-presence-check | Playbook `dead-social-pitch`; or `analyze_website`: `checks` social, `socialNetworks`, `facebookDetails` | khadinakbar/contact-details-scraper, khadinakbar/instagram-profile-scraper, khadinakbar/facebook-followers-scraper, khadinakbar/tiktok-profile-scraper, khadinakbar/twitter-profile-followers-scraper |
| AI visibility sample | ai-visibility-check | Playbook `ai-search-gap`; or `analyze_website`: `checks` ai (top 10 leads, one question per city) | khadinakbar/ai-search-brand-monitor |
| Under N stars | low-rating-leads | Playbook `low-rating-rescue`; or `plan_leads` then `find_leads` with `maxRating`, `minRating`, `minReviews`, `maxReviews` | khadinakbar/google-maps-leads-scraper and the two checkers |
| Hot, warm or cold only | hot-leads-only | `get_leads` with `priority` (one value); or `find_leads` or `run_playbook` with `priority` (one value or a list) | VibeLeads itself (scoring) |
| Every week, only new ones | weekly-new-leads | `plan_leads` then `schedule_leads`: search arguments, optional `playbook`, `frequency`, `listName`, `approved`, `maxSpendUsd`; `manage_schedules`: `action`, `scheduleId` | VibeLeads itself, on a timer in the user's Apify account |
| Own mix of steps (e.g. no website plus contact details) | build-your-own-workflow | `suggest_workflow`: `sells`, `needs`, `niche`, `location` or `locations`, `count`, `listName`; `list_nodes`; `plan_workflow`: `nodes`, search and filter arguments, `lookAt`, `listName`; `run_workflow`: same plus `approved`, `maxSpendUsd` | Whichever Actors the chosen steps need, all from the same fixed list |
| Basic or premium email check | email-verification | Basic: part of every search, or `clean_list` with `checkEmails`. Premium: step `verify_email_premium` in `plan_workflow` then `run_workflow` (about 3.6 cents per email, only when asked) | khadinakbar/email-address-validator; premium khadinakbar/zerobounce-alternative |
| Site up, speed, domain age, links, SEO, social, AI as steps in one run | website-health-and-seo-audit | `plan_workflow` then `run_workflow` with steps `check_site_up`, `check_speed`, `check_domain_age`, `check_broken_links`, `seo_audit`, `check_social`, `ai_visibility`, `check_email_setup`, `detect_tech_stack`, `watch_site_changes` | The website Actors listed above |
| Ready-made recipe | pick-a-playbook | `list_playbooks`: `audience`, `service`; `plan_playbook` then `run_playbook`: `playbook`, search arguments, `extraTopN`, `listName`, `approved`, `maxSpendUsd` | Depends on the playbook; always from the same fixed list |
| New businesses | pick-a-playbook | Playbook `new-business-finder` | Search Actors plus khadinakbar/bulk-whois-lookup |
| Real estate agents | pick-a-playbook | Playbook `real-estate-agent-leads` (no `niche` needed) | Search Actors plus the social Actors |
| Remove duplicates, tidy | clean-and-export-leads | `clean_list`: `listId` or `rows`, `mode`, `view`, `checkSites`, `checkEmails`, `approved` | VibeLeads itself; paid checks use khadinakbar/website-uptime-monitor and khadinakbar/email-address-validator |
| Spreadsheet export | clean-and-export-leads | `export_leads`: `listId` | VibeLeads itself |
| "They replied", "we won" | clean-and-export-leads | `mark_lead`: `listId`, `leadId`, `status`, `note` | VibeLeads itself |
| Read a saved list | vibeleads-core | `get_leads`: `listId`, `limit`, `offset`, `priority`, `onlyWithProblem`, `sortBy` | VibeLeads itself |
| Progress | vibeleads-core | `lead_status`: `listId` | VibeLeads itself |
| Outreach drafts | pitch-and-outreach-drafts | `get_leads` for the evidence; the assistant writes the drafts | No Actor. Nothing is sent |
| Audience guides | for-web-designers, for-seo-freelancers-and-agencies, for-ads-and-social-agencies | Chains of the skills above | As above |

## Rule for every paid tool

Quote first with the free tool (`plan_leads`, `plan_playbook`, `plan_workflow`; `analyze_website` and `clean_list` without `approved`). Show the cost. Run only after the user says yes: call the paid tool (`find_leads`, `run_playbook`, `run_workflow`, `schedule_leads`, `analyze_website`) with the same arguments plus `"approved": true` and `"maxSpendUsd"`.

## Honest limits to repeat

- No-website, low-rating and similar filters on big cities may need a higher `lookAt` (up to 2,000). Quote again after raising it.
- Emails are rare for leads without a website. Contacts are never guessed.
- A workflow cannot be scheduled yet; schedule a playbook or a plain search.
- `watch_site_changes` shows nothing but a saved starting point on its first run. Use the same watchlist name and the same websites on every later run. A workflow with it cannot also use `dedupe_against_list`.

## Read helpers (no work, no cost)

| Helper | Use |
|---|---|
| `get-actor-run` | Check whether a VibeLeads run has finished |
| `get-dataset-items` | Read lead rows or the one answer row |
| `get-key-value-store-record` | Read `OUTPUT` and `RUN_SUMMARY` |
| `abort-actor-run` | Stop a VibeLeads run the user wants cancelled |

## Slash commands

| Command | Skill it starts |
|---|---|
| /find-leads | find-local-leads, or the matching filter skill |
| /lead-playbooks | pick-a-playbook |
| /build-workflow | build-your-own-workflow |
| /check-websites | website-speed-check, seo-audit, social-presence-check, ai-visibility-check, website-health-and-seo-audit |
| /weekly-leads | weekly-new-leads |
| /export-leads | clean-and-export-leads |

## Not supported

- Checking a plain website address that is not in a saved list.
- Sending emails or messages.
- Review text, ad spend, private people, opening dates, Google rankings or traffic.
- Any Actor outside VibeLeads' own fixed list.
