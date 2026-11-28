import {emailEvidence} from "./mailbox-evidence.js";
import { contactPolicy, listPolicy, type RecordStore } from "./saved-list-policy";
import { recordArray } from "./record-array";
import type { DataRow } from "./data-view";

export const collections = {
  local: {
    store: "vibeleads-mcp-state",
    prefix: "leads.",
    job: "job.",
    label: "Local business lists",
  },
  prospecting: {
    store: "vibeleads-mcp-state",
    prefix: "lsleads.",
    job: "lsearch.",
    label: "Prospecting and enrichment lists",
  },
  "local-secondary": {
    store: "vibeleads-mcp-state-2",
    prefix: "leads.",
    job: "job.",
    label: "Additional local business lists",
  },
  "prospecting-secondary": {
    store: "vibeleads-mcp-state-2",
    prefix: "lsleads.",
    job: "lsearch.",
    label: "Additional prospecting lists",
  },
} as const;
export type Collection = keyof typeof collections;
export const isCollection = (x: unknown): x is Collection =>
  typeof x === "string" && Object.hasOwn(collections, x);
export const listId = (x: unknown): x is string =>
  typeof x === "string" &&
  /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(x);
export type Account = { username: string; accountId: string; accessToken: string };
export type Get = (path: string, token: string) => Promise<Response>;
type Dict = Record<string, unknown>;
const obj = (x: unknown): Dict =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Dict) : {};
const str = (x: unknown) =>
  typeof x === "string" ? x.trim().slice(0, 180) : "";
const status = (e: unknown) => obj(e).status;
async function optional(get: Get, path: string, token: string) {
  try {
    return await get(path, token);
  } catch (e) {
    if (status(e) === 404) return null;
    throw e;
  }
}
async function storePath(get: Get, a: Account, c: Collection) {
  const name = collections[c].store;
  const r = await optional(
    get,
    "key-value-stores/" + encodeURIComponent(a.username + "~" + name),
    a.accessToken,
  );
  if (!r) return null;
  const s = obj((await r.json()).data);
  if (
    s.userId !== a.accountId ||
    s.name !== name ||
    typeof s.id !== "string" ||
    !/^\w{17}$/.test(s.id)
  )
    throw Error("Cannot confirm saved-list ownership");
  return "key-value-stores/" + s.id;
}
function policyStore(get: Get, path: string, token: string): RecordStore {
  return {
    async get(key) {
      const response = await optional(
        get,
        path + "/records/" + encodeURIComponent(key),
        token,
      );
      return response ? response.json() : null;
    },
    async keys(prefix, limit, after) {
      const found: string[] = [];
      let cursor = after;
      while (found.length < limit) {
        const query = new URLSearchParams({
          prefix,
          limit: String(limit - found.length),
        });
        if (cursor) query.set("exclusiveStartKey", cursor);
        const data = obj(
          (await (await get(path + "/keys?" + query, token)).json()).data,
        );
        if (!Array.isArray(data.items))
          throw Error("Saved list permissions unavailable");
        const keys = data.items.map((item) => obj(item).key);
        if (
          !keys.every(
            (key): key is string =>
              typeof key === "string" &&
              key.startsWith(prefix) &&
              (!cursor || key > cursor),
          )
        )
          throw Error("Invalid permission records");
        found.push(...keys);
        if (!data.isTruncated) break;
        if (!keys.length || data.nextExclusiveStartKey !== keys.at(-1))
          throw Error("Incomplete permission records");
        cursor = keys.at(-1);
      }
      return found;
    },
  };
}
async function accountListPolicy(get:Get, account:Account, family:Collection, path:string, id:string) {
  const alternate = family.endsWith("-secondary") ? "local" : "local-secondary";
  const other = await storePath(get,account,alternate);
  return listPolicy(policyStore(get,path,account.accessToken),id,other && other!==path ? policyStore(get,other,account.accessToken) : undefined);
}
export async function runContactPolicy(
  get: Get,
  account: Account,
  id: unknown,
  origin: unknown,
) {
  const stores = await Promise.all(
    (["local", "local-secondary"] as const).map(async (family) => {
      const name = collections[family].store;
      const path = await storePath(get, account, family);
      return path
        ? { name, store: policyStore(get, path, account.accessToken) }
        : null;
    }),
  );
  const available = stores.filter((store) => !!store);
  const knownOrigin = Object.values(collections).some(
    (family) => family.store === origin,
  );
  const markStores = knownOrigin
    ? available.filter((item) => item.name === origin)
    : available;
  return contactPolicy(
    available.map((item) => item.store),
    markStores.map((item) => item.store),
    listId(id) ? id : undefined,
    true,
  );
}
async function title(
  get: Get,
  path: string,
  token: string,
  family: Collection,
  id: string,
) {
  const res = await optional(
    get,
    path + "/records/" + collections[family].job + id,
    token,
  );
  const j = res ? obj(await res.json()) : {};
  if (j.id !== id)
    return {
      name: family.startsWith("local")
        ? "Saved business list"
        : "Saved prospect list",
      date: null,
    };
  const req = obj(j.request),
    query = obj(j.query);
  const name =
    [str(req.niche), str(req.area)].filter(Boolean).join(" · ") ||
    str(j.query) ||
    [
      str(query.niche) || str(query.keywords) || str(query.industry),
      str(query.location) || str(query.area),
    ]
      .filter(Boolean)
      .join(" · ") ||
    str(j.useCase).replaceAll("_", " ") ||
    "Saved prospect list";
  return {
    name,
    date:
      typeof j.createdAt === "string" &&
      Number.isFinite(Date.parse(j.createdAt))
        ? j.createdAt
        : null,
  };
}
export async function savedPage(
  get: Get,
  a: Account,
  family: Collection,
  after?: string,
) {
  const spec = collections[family],
    path = await storePath(get, a, family);
  if (!path) return { items: [], next: null };
  const q = new URLSearchParams({ prefix: spec.prefix, limit: "6" });
  if (after && listId(after)) q.set("exclusiveStartKey", spec.prefix + after);
  const response = await get(path + "/keys?" + q, a.accessToken),
    data = obj((await response.json()).data);
  if (!Array.isArray(data.items)) throw Error("Saved lists unavailable");
  const keys = data.items
    .map(obj)
    .map((x) => x.key)
    .filter(
      (x): x is string =>
        typeof x === "string" &&
        x.startsWith(spec.prefix) &&
        listId(x.slice(spec.prefix.length)),
    );
  const items = await Promise.all(
    keys.map(async (key) => {
      const id = key.slice(spec.prefix.length);
      return {
        id,
        family,
        ...(await title(get, path, a.accessToken, family, id)),
      };
    }),
  );
  const cursor =
    typeof data.nextExclusiveStartKey === "string"
      ? data.nextExclusiveStartKey
      : "";
  return {
    items,
    next:
      data.isTruncated === true &&
      cursor.startsWith(spec.prefix) &&
      listId(cursor.slice(spec.prefix.length))
        ? cursor.slice(spec.prefix.length)
        : null,
  };
}
const textFields = new Set(
  "leadId status note at providerEmailStatus mailboxType emailOwnership emailDeliverability name businessName company companyName title jobTitle role kind category industry address searchedCity city region country domain phone email workEmail emailStatus priority score rating reviews whyTheyNeedYou source pitch scoreWhy description staffRange employeeCount revenueRange foundedYear fundingStage totalFunding firstName lastName seniority department companyDomain location headline daysInRole followers following posts avgViews engagementRate lastPostAt platform handle niche language accountType text author postedAt community checkedOn".split(
    " ",
  ),
);
const urlFields = new Set([
  "website",
  "sourceUrl",
  "linkedinUrl",
  "companyLinkedinUrl",
  "googleMapsUrl",
  "profileUrl",
  "authorUrl",
  "url",
  "linkInBio",
]);
const listFields = new Set([
  "sources",
  "skills",
  "investors",
  "techUsed",
  "matchedWords",
  "whyTheyNeedYou",
]);
function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (["https:", "http:"].includes(u.protocol) && !u.username && !u.password)
      return u.href;
  } catch {}
  return null;
}
function identifiable(r: Dict) {
  if (r.kind === "post")
    return Boolean(str(r.text) && (safeUrl(r.url) || str(r.author)));
  if (r.kind === "creator" && str(r.handle)) return true;
  return [
    "name",
    "firstName",
    "businessName",
    "company",
    "companyName",
    "domain",
    "website",
    "email",
    "workEmail",
    "profileUrl",
  ].some((k) => str(r[k]));
}
function eligible(row:Dict) {
  return !([
        "tool",
        "ok",
        "result",
        "error",
        "quoteId",
        "estimate",
        "nextCall",
        "nextCalls",
      ].some((k) => k in row) ||
      !identifiable(row));
}
function withEmailEvidence(row:Dict){
  if(!str(row.workEmail)&&!str(row.email))return row;
  const evidence=emailEvidence(row);
  return {...row,...evidence,emailStatus:evidence.emailStatus==="unconfirmed"?row.emailStatus||evidence.emailStatus:evidence.emailStatus};
}
export function savedProspects(input: unknown): DataRow[] {
  if (!Array.isArray(input)) throw Error("Saved result is not a list");
  return input.flatMap((value) => {
    const r = withEmailEvidence(obj(value));
    if (!eligible(r)) return [];
    const out: DataRow = {};
    for (const [k, v] of Object.entries(r)) {
      if (
        textFields.has(k) &&
        ((typeof v === "number" && Number.isFinite(v)) || typeof v === "string")
      )
        out[k] = typeof v === "string" ? v.slice(0, 4200) : v;
      if (urlFields.has(k)) {
        const u = safeUrl(v);
        if (u) out[k] = u;
      }
      if (listFields.has(k) && Array.isArray(v))
        out[k] = v
          .filter((x): x is string => typeof x === "string")
          .slice(0, 25)
          .map((x) => x.slice(0, 500))
          .join(" · ");
      if (k === "whyNow" && Array.isArray(v))
        out.whyNow = v
          .slice(0, 25)
          .map(obj)
          .filter((x) => str(x.label))
          .map((x) =>
            [
              str(x.label),
              typeof x.proof === "string" ? x.proof.slice(0, 500) : "",
            ]
              .filter(Boolean)
              .join(": "),
          )
          .join("\n");
      if (["verified", "recentJobChange"].includes(k) && typeof v === "boolean")
        out[k] = v;
    }
    if (r.kind === "person" && str(r.workEmail) && !str(out.email))
      out.email = str(r.workEmail);
    return Object.keys(out).length ? [out] : [];
  });
}
export async function savedList(
  get: Get,
  a: Account,
  family: Collection,
  id: string,
) {
  if (!listId(id)) return null;
  const path = await storePath(get, a, family);
  if (!path) return null;
  const response = await optional(
    get,
    path + "/records/" + collections[family].prefix + id,
    a.accessToken,
  );
  if (!response) return null;
  const meta = await title(get, path, a.accessToken, family, id);
  const storeId = path.split("/")[1],
    storageUrl =
      "https://console.apify.com/storage/key-value-stores/" + storeId;
  const max = 4 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    return { ...meta, rows: null, storageUrl };
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error("List unavailable");
  const decoder = new TextDecoder();
  let bytes = 0,
    body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      return { ...meta, rows: null, storageUrl };
    }
    body += decoder.decode(value, { stream: true });
  }
  const policy = await accountListPolicy(get,a,family,path,id);
  const raw: unknown = JSON.parse(body + decoder.decode());
  if (!Array.isArray(raw)) throw Error("Saved result is not a list");
  return {
    ...meta,
    rows: savedProspects(raw.map((row) => policy(obj(row))).filter(Boolean)),
    storageUrl,
  };
}

/** Stream a single authorized Actor result without loading the entire JSON into memory. */
export async function savedDownload(
  get: Get,
  a: Account,
  family: Collection,
  id: string,
) {
  if (!listId(id)) return null;
  const path = await storePath(get, a, family);
  if (!path) return null;
  const source = await optional(
    get,
    path + "/records/" + collections[family].prefix + id,
    a.accessToken,
  );
  if (!source) return null;
  if (!source.body) throw Error("List unavailable");
  const policy = await accountListPolicy(get,a,family,path,id);
  const records = recordArray(source.body);
  const encoder = new TextEncoder();
  let first = true;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("["));
    },
    async pull(controller) {
      for (;;) {
        const next = await records.next();
        if (next.done) {
          controller.enqueue(encoder.encode("]"));
          controller.close();
          return;
        }
        const row = policy(obj(next.value));
        if (!row) continue;
        if (!eligible(row)) continue;
        const safe = withEmailEvidence(row);
        controller.enqueue(
          encoder.encode((first ? "" : ",") + JSON.stringify(safe)),
        );
        first = false;
        return;
      }
    },
    async cancel() {
      await records.return(undefined);
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="vibeleads-${id}.json"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

const roleMailboxes = new Set(
  "info contact hello hi office admin sales support enquiries inquiries booking bookings reservations service team mail help manager accounts billing orders reception frontdesk".split(
    " ",
  ),
);
function passedAddressCheck(r: DataRow) {
  const address = str(r.workEmail) || str(r.email);
  const status = str(r.emailStatus).toLowerCase();
  return (
    Boolean(address) &&
    !roleMailboxes.has(address.split("@")[0].toLowerCase().split("+")[0]) &&
    ["verified", "valid", "deliverable", "ok", "safe"].includes(status)
  );
}
export function salesSummary(rows: DataRow[]) {
  const prospects = rows.filter((r) => r.kind !== "post");
  const emailOnFile = prospects.filter(
    (r) =>
      typeof r.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email),
  );
  const reportedPriority = { hot: 0, warm: 0, cold: 0 };
  const scoreBands = [0, 0, 0];
  let scores = 0;
  for (const row of prospects) {
    const priority =
      typeof row.priority === "string" ? row.priority.toLowerCase() : "";
    if (Object.hasOwn(reportedPriority, priority))
      reportedPriority[priority as keyof typeof reportedPriority]++;
    if (
      typeof row.score === "number" &&
      Number.isFinite(row.score) &&
      row.score >= 0 &&
      row.score <= 100
    ) {
      scores++;
      scoreBands[row.score >= 70 ? 0 : row.score >= 45 ? 1 : 2]++;
    }
  }
  const priorities = Object.values(reportedPriority).reduce(
    (n, count) => n + count,
    0,
  );
  const groups = priorities
    ? ([
        ["High priority", reportedPriority.hot],
        ["Medium priority", reportedPriority.warm],
        ["Low priority", reportedPriority.cold],
      ] as const)
    : scores
      ? ([
          ["Score 70–100", scoreBands[0]],
          ["Score 45–69", scoreBands[1]],
          ["Score below 45", scoreBands[2]],
        ] as const)
      : [];
  return {
    groups,
    ranked: priorities || scores,
    prospects: prospects.length,
    emailOnFile: emailOnFile.length,
    passedEmailCheck: emailOnFile.filter(passedAddressCheck).length,
    withRecordedCheck: emailOnFile.some(
      (r) => typeof r.emailStatus === "string" && r.emailStatus.trim() !== "",
    ),
  };
}
