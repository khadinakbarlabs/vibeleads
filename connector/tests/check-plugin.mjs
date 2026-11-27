#!/usr/bin/env node
// Offline check of the VibeLeads plugin files. No network. Run: node tests/check-plugin.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT_URL = 'https://mcp.apify.com/?tools=khadinakbar/vibeleads';
const TOOLS = new Set(['seller_project', 'start', 'list_playbooks', 'plan_playbook', 'run_playbook', 'plan_leads', 'find_leads', 'lead_status', 'get_leads', 'analyze_website', 'mark_lead', 'clean_list', 'export_leads', 'schedule_leads', 'manage_schedules', 'suggest_workflow', 'list_nodes', 'plan_workflow', 'run_workflow']);
// Workflow step ids (nodes) from list_nodes; they appear in backticks in the workflow skills.
const NODES = new Set(['find_places', 'filter_rating', 'filter_reviews', 'filter_website_status', 'filter_new', 'filter_priority', 'collect_contacts', 'validate_email', 'verify_email_premium', 'check_site_up', 'check_speed', 'check_domain_age', 'check_broken_links', 'seo_audit', 'check_social', 'ai_visibility', 'check_email_setup', 'detect_tech_stack', 'watch_site_changes', 'score_and_pitch', 'dedupe_against_list', 'save_list', 'export']);
// Argument and field names written in backticks.
const ARGS = new Set(['no_website', 'slow_website', 'weak_seo', 'low_rating', 'new_businesses', 'hot_only', 'verified_emails', 'ai_visibility', 'email_setup', 'outdated_tech', 'site_changes']);
const HELPERS = new Set(['get-actor-run', 'get-dataset-items', 'get-key-value-store-record', 'abort-actor-run']);
// snake_case words that are values, not tools (statuses for mark_lead).
const NOT_TOOLS = new Set(['no_reply', 'bad_fit']);
const FORBIDDEN = ['call-actor', 'search-actors', 'fetch-actor-details', 'add-actor'];
const REQUIRED_SKILLS = ['vibeleads-core', 'find-local-leads', 'no-website-or-slow-site-leads', 'weak-seo-leads', 'low-rating-leads', 'hot-leads-only', 'weekly-new-leads', 'website-speed-check', 'seo-audit', 'ai-visibility-check', 'social-presence-check', 'pick-a-playbook', 'clean-and-export-leads', 'pitch-and-outreach-drafts', 'for-web-designers', 'for-seo-freelancers-and-agencies', 'for-ads-and-social-agencies', 'build-your-own-workflow', 'email-verification', 'website-health-and-seo-audit', 'tech-stack-and-email-setup-pitch'];
const REQUIRED_COMMANDS = ['find-leads', 'lead-playbooks', 'check-websites', 'weekly-leads', 'export-leads', 'build-workflow'];
const JSON_FILES = ['.mcp.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.cursor-plugin/plugin.json', '.codex-plugin/plugin.json'];

const failures = [];
let checks = 0;
const check = (ok, message) => { checks += 1; if (!ok) failures.push(message); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1').trim();
  }
  return out;
}

// 1. JSON files parse.
const parsed = {};
for (const rel of JSON_FILES) {
  try { parsed[rel] = JSON.parse(read(rel)); check(true); } catch (e) { check(false, `${rel}: not valid JSON (${e.message})`); }
}

// 2. The connection is exactly the strict address, and the only one.
const servers = parsed['.mcp.json']?.mcpServers || {};
check(Object.keys(servers).length === 1, '.mcp.json: must define exactly one server');
check(servers.vibeleads?.url === STRICT_URL, `.mcp.json: url must be exactly ${STRICT_URL}`);
check(servers.vibeleads?.type === 'http', '.mcp.json: type must be "http"');

// 3. Manifests.
const manifest = parsed['.claude-plugin/plugin.json'] || {};
check(manifest.name === 'vibeleads', 'plugin.json: name must be "vibeleads"');
check(manifest.displayName === 'VibeLeads', 'plugin.json: displayName must be "VibeLeads"');
check(manifest.version === '1.4.0', 'plugin.json: version must be 1.4.0');
const market = parsed['.claude-plugin/marketplace.json'] || {};
check(market.metadata?.version === '1.4.0', 'marketplace.json: metadata version must be 1.4.0');
check(parsed['.cursor-plugin/plugin.json']?.version === '1.4.0', 'cursor plugin.json: version must be 1.4.0');
check(parsed['.codex-plugin/plugin.json']?.version === '1.4.0', 'codex plugin.json: version must be 1.4.0');
check(Array.isArray(market.plugins) && market.plugins.some((p) => p.name === 'vibeleads' && p.source === './'), 'marketplace.json: must list the vibeleads plugin with source "./"');
for (const rel of ['README.md', 'LICENSE', 'TOOL-MAP.md']) check(existsSync(join(ROOT, rel)), `${rel}: missing`);

// 4. Skills: frontmatter and required set.
const skillDirs = readdirSync(join(ROOT, 'skills')).filter((d) => statSync(join(ROOT, 'skills', d)).isDirectory());
for (const name of REQUIRED_SKILLS) check(skillDirs.includes(name), `skills/${name}: missing`);
const texts = [];
for (const dir of skillDirs) {
  const rel = `skills/${dir}/SKILL.md`;
  if (!existsSync(join(ROOT, rel))) { check(false, `${rel}: missing`); continue; }
  const text = read(rel);
  texts.push([rel, text]);
  const fm = frontmatter(text);
  check(Boolean(fm), `${rel}: no frontmatter block`);
  check(fm?.name === dir, `${rel}: frontmatter name must equal the folder name`);
  check((fm?.description || '').length >= 60 && (fm?.description || '').length <= 1024, `${rel}: description must be 60-1024 characters`);
  check(text.replace(/^---[\s\S]*?---\n/, '').trim().length > 300, `${rel}: body is too short`);
  if (dir !== 'vibeleads-core') check(text.includes('../vibeleads-core/SKILL.md'), `${rel}: must point to vibeleads-core`);
  // relative links to other skills resolve
  for (const link of text.matchAll(/\]\((\.\.\/[^)]+)\)/g)) check(existsSync(join(ROOT, 'skills', dir, link[1])), `${rel}: broken link ${link[1]}`);
}
const core = texts.find(([rel]) => rel.includes('vibeleads-core'))?.[1] || '';
check(!/another developer|other developers/i.test(core), 'vibeleads-core: must not tell assistants to avoid other developers');
check(core.includes('"approved": true') && core.includes('maxSpendUsd'), 'vibeleads-core: must describe approval and the spending cap');

// 5. Commands.
for (const name of REQUIRED_COMMANDS) {
  const rel = `commands/${name}.md`;
  if (!existsSync(join(ROOT, rel))) { check(false, `${rel}: missing`); continue; }
  const text = read(rel);
  texts.push([rel, text]);
  const fm = frontmatter(text);
  check(Boolean(fm?.description), `${rel}: frontmatter needs a description`);
  for (const m of text.matchAll(/`([a-z0-9-]+)` skill/g)) check(skillDirs.includes(m[1]), `${rel}: names a skill that does not exist (${m[1]})`);
}
// Every live tool is named in the core skill, and the workflow skills use real node ids.
for (const tool of TOOLS) check(core.includes('`' + tool + '`'), `vibeleads-core: tool ${tool} is not listed`);
for (const [rel, text] of texts) for (const m of text.matchAll(/"node"\s*:\s*"([^"]+)"/g)) check(NODES.has(m[1]), `${rel}: unknown node id in an example: ${m[1]}`);
texts.push(['TOOL-MAP.md', read('TOOL-MAP.md')], ['README.md', read('README.md')]);

// 6. Tool names, forbidden tools, and other developers' Actors, in every text file.
for (const [rel, text] of texts) {
  for (const m of text.matchAll(/"tool"\s*:\s*"([^"]+)"/g)) check(TOOLS.has(m[1]) || m[1] === '<name>', `${rel}: unknown VibeLeads tool in a call example: ${m[1]}`);
  for (const m of text.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)) check(TOOLS.has(m[1]) || NOT_TOOLS.has(m[1]) || NODES.has(m[1]) || ARGS.has(m[1]), `${rel}: unknown tool name: ${m[1]}`);
  for (const m of text.matchAll(/`((?:get|abort|call|search|fetch|add)-[a-z-]+)`/g)) check(HELPERS.has(m[1]), `${rel}: helper tool not allowed: ${m[1]}`);
  for (const word of FORBIDDEN) check(!text.toLowerCase().includes(word), `${rel}: must not mention ${word}`);
  const noUrls = text.replace(/https?:\/\/\S+/g, ' ');
  for (const m of noUrls.matchAll(/(?<![\w./-])([a-z0-9][a-z0-9-]+)\/([a-z0-9][a-z0-9-]+)(?![\w./-])/g)) {
    check(m[1] === 'khadinakbar', `${rel}: looks like an Actor that is not the owner's: ${m[0]}`);
  }
  for (const m of text.matchAll(/https?:\/\/mcp\.apify\.com\S*/g)) check(m[0].replace(/[`)."']+$/, '') === STRICT_URL, `${rel}: connection address differs from the strict one: ${m[0]}`);
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} problem(s) in ${checks} checks`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`PASS: ${checks} checks, ${skillDirs.length} skills, ${REQUIRED_COMMANDS.length} commands`);
