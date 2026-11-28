// Account suppression policy shared by the Actor and the read-only seller dashboard.
const legacyKey = 'dnc.v1';
const eventPrefix = 'dnc.v2.';
const migrated = 'dnc.v3.migrated';
const entryPrefix = 'dnc.v3.entry.';
const seedPrefix = 'dnc.v3.seed.';
const unavailable = () =>
  Object.assign(new Error('The do-not-contact list could not be read. Retry before using these leads.'), {
    code: 'STATE_UNAVAILABLE',
  });
const stripWww = (host) => host.toLowerCase().replace(/^www\./, '');
const socialHosts = {
  'x.com': 'x',
  'twitter.com': 'x',
  'mobile.twitter.com': 'x',
  'reddit.com': 'reddit',
  'old.reddit.com': 'reddit',
  'new.reddit.com': 'reddit',
};
function parsed(value) {
  const raw = String(value || '').trim();
  if (!raw || /\s/.test(raw)) return null;
  const url = URL.parse(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
  return url && !url.username && !url.password && url.hostname.includes('.') ? url : null;
}
function handle(value, platform) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(platform === 'reddit' ? /^\/?(?:u|user)\/|^@/ : /^@/, '');
  const pattern =
    platform === 'x'
      ? /^[a-z0-9_]{1,15}$/
      : platform === 'reddit'
        ? /^[a-z0-9_-]{1,20}$/
        : /^[a-z0-9_.-]{1,100}$/;
  return pattern.test(clean) ? clean : null;
}
function socialUrl(url) {
  if (!url) return null;
  const host = stripWww(url.hostname),
    platform = socialHosts[host];
  if (!platform) return null;
  const match =
    platform === 'x'
      ? /^\/([a-z0-9_]{1,15})(?:\/status\/\d+)?\/?$/i.exec(url.pathname)
      : /^\/(?:u|user)\/([a-z0-9_-]{1,20})\/?$/i.exec(url.pathname);
  const name = match?.[1].toLowerCase();
  if (
    platform === 'x' &&
    ['i', 'home', 'explore', 'search', 'notifications', 'messages', 'settings', 'intent', 'share'].includes(
      name,
    )
  )
    return { platform };
  return { platform, name };
}
function contactKey(value) {
  const input = String(value || '').trim();
  const raw = input.toLowerCase();
  if (!raw) return null;
  const bound = /^(reddit|x|twitter):\s*(.+)$/.exec(raw);
  const platform =
    bound?.[1] === 'twitter' ? 'x' : (bound?.[1] ?? (/^\/?(?:u|user)\//.test(raw) ? 'reddit' : null));
  if (platform) {
    const user = handle(bound?.[2] ?? raw, platform);
    return user ? 'handle:' + platform + ':' + user : null;
  }
  if (raw.startsWith('@')) {
    const user = handle(raw);
    return user ? 'handle:*:' + user : null;
  }
  if (/^[^@\s/]+@[^@\s/]+$/.test(raw)) return 'email:' + raw;
  const url = parsed(input);
  if (url) {
    const host = stripWww(url.hostname),
      social = socialUrl(url);
    if (social?.name) return 'handle:' + social.platform + ':' + social.name;
    const linkedin = host === 'linkedin.com' && /^\/(in|company|school)\/([^/?#]+)\/?$/i.exec(url.pathname);
    if (linkedin) return ('linkedin:' + linkedin[1] + '/' + linkedin[2]).toLowerCase();
    if (
      ['youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'tiktok.com'].includes(host) &&
      url.pathname !== '/'
    )
      return 'profile:' + host + url.pathname.replace(/\/$/, '');
    if (social && url.pathname !== '/') return 'page:' + host + url.pathname.replace(/\/$/, '');
    return 'domain:' + host;
  }
  const user = handle(raw);
  return user ? 'handle:*:' + user : null;
}
export const exclusionSet = (values) => new Set(values.map(contactKey).filter(Boolean));
export function matchesContactExclusion(row, exclusions) {
  if (!exclusions?.size) return false;
  const excludedDomain = (host) => {
    if (!host) return false;
    const labels = stripWww(host).split('.');
    return labels.some(
      (_, i) => i < labels.length - 1 && exclusions.has('domain:' + labels.slice(i).join('.')),
    );
  };
  const links = [row.socials, row.socialLinks].flatMap((collection) =>
    Array.isArray(collection)
      ? collection
      : ['facebook', 'instagram', 'linkedin', 'x', 'twitter', 'reddit', 'youtube', 'tiktok']
          .map((platform) => collection?.[platform])
  ).filter((link) => typeof link === 'string' && parsed(link));
  const addresses = [row.emails, row.otherEmails, row.contactCandidates]
    .filter(Array.isArray)
    .flatMap((items) => items.map((item) => typeof item === 'string' ? item : item?.email))
    .filter((email) => typeof email === 'string' && email.includes('@'));
  const values = [
    ...links,
    ...addresses,
    row.domain,
    row.companyDomain,
    row.publisher,
    row.email,
    row.workEmail,
    row.contactEmail,
    row.replyAddress,
    row.linkedinUrl,
    row.companyLinkedinUrl,
    row.url,
    row.website,
    row.profileUrl,
    row.sourceUrl,
    row.contactSourceUrl,
    row.applicationUrl,
    row.applyUrl,
    row.authorUrl,
    row.channelUrl,
    row.resultUrl,
    row.review?.contact?.email,
    row.contactCandidate?.email,
  ].filter(Boolean);
  const ownerUrls = [row.url, row.profileUrl, row.authorUrl, row.sourceUrl, row.channelUrl, ...links]
    .map(parsed)
    .filter(Boolean);
  for (const value of values) {
    const key = contactKey(value);
    if (exclusions.has(key)) return true;
    if (key?.startsWith('email:') && excludedDomain(key.split('@')[1])) return true;
    const url = parsed(value);
    if (url && excludedDomain(url.hostname)) return true;
  }
  const owners = ownerUrls.map(socialUrl).filter(Boolean);
  if (owners.some((owner) => owner.name && exclusions.has('handle:*:' + owner.name))) return true;
  const owner = owners[0];
  const nativePlatform = { x: 'x', twitter: 'x', reddit: 'reddit' }[
    String(row.platform ?? '').toLowerCase()
  ];
  const platform = owner?.platform ?? nativePlatform;
  // A status URL identifies its account. An unrelated publisher path and a display name do not.
  const user =
    owner?.name ??
    (platform && handle(row.handle ?? row.author, platform)) ??
    (row.handle && handle(row.handle));
  return Boolean(
    user &&
    (exclusions.has('handle:*:' + user) || (platform && exclusions.has('handle:' + platform + ':' + user))),
  );
}
export const isExcluded = matchesContactExclusion;

async function listKeys(store, prefix) {
  if (typeof store?.keys !== 'function') throw unavailable();
  const keys = [];
  let after;
  do {
    const page = await store.keys(prefix, 500, after);
    if (!Array.isArray(page)) throw unavailable();
    keys.push(...page);
    if (page.length < 500) break;
    if (page.at(-1) === after) throw unavailable();
    after = page.at(-1);
  } while (after);
  return keys;
}
async function batches(rows, fn) {
  for (let i = 0; i < rows.length; i += 24) await Promise.all(rows.slice(i, i + 24).map(fn));
}
async function token(value) {
  const key = contactKey(value);
  if (!key) return null;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function oldEntries(store) {
  const events = await listKeys(store, eventPrefix);
  const decisions = new Map();
  const put = (entry, removed = false) => {
    const key = contactKey(entry.value);
    if (key && !decisions.has(key)) decisions.set(key, removed ? null : entry);
  };
  for (const key of events) {
    const event = await store.get(key);
    if (!event) throw unavailable();
    if (event.scrubbed) continue;
    if (event.action === 'clear') return [...decisions.values()].filter(Boolean);
    for (const entry of event.entries) put(entry, event.action === 'remove');
  }
  const legacy = await store.get(legacyKey);
  for (const entry of legacy?.entries ?? []) put(entry);
  return [...decisions.values()].filter(Boolean);
}
export async function loadDnc(store) {
  if (typeof store?.get !== 'function') throw unavailable();
  const entries = new Map();
  if (!(await store.get(migrated))) {
    for (const entry of await oldEntries(store)) entries.set(await token(entry.value), entry);
  }
  for (const prefix of [seedPrefix, entryPrefix]) {
    await batches(await listKeys(store, prefix), async (key) => {
      const record = await store.get(key);
      if (!record) throw unavailable();
      if (record.entry) entries.set(key.slice(prefix.length), record.entry);
      else entries.delete(key.slice(prefix.length));
    });
  }
  return { entries: [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value) };
}
export async function contactExclusions(store) {
  return exclusionSet((await loadDnc(store)).entries.map((e) => e.value));
}
export { contactKey };

// Legacy seeds stay in a separate namespace so concurrent migration cannot overwrite a newer user decision.
export async function migrateDnc(store) {
  if (!(await store.get(migrated))) {
    const legacy = await oldEntries(store);
    if (!(await store.get(migrated))) {
      await batches(legacy, async (entry) => {
        const id = await token(entry.value);
        await store.set(seedPrefix + id, { entry });
        if (await store.get(entryPrefix + id)) await store.set(seedPrefix + id, { removed: true });
      });
      await store.set(migrated, { version: 3 });
    }
  }
  // Scrub even after another worker completed migration or a previous cleanup was interrupted.
  if ((await store.get(legacyKey))?.entries?.length) await store.set(legacyKey, { entries: [] });
  await batches(await listKeys(store, eventPrefix), async (key) => {
    if (!(await store.get(key))?.scrubbed) await store.set(key, { scrubbed: true });
  });
}
export async function writeDncEntries(store, entries, remove = false) {
  await batches(entries, async (entry) => {
    const id = await token(entry.value);
    if (!id) return;
    if (!remove) await store.set(entryPrefix + id, { entry });
    const legacy = await store.get(seedPrefix + id);
    if (legacy?.entry) await store.set(seedPrefix + id, { removed: true });
    if (remove) await store.set(entryPrefix + id, { removed: true });
  });
}
