import assert from "node:assert/strict";
import { test } from "node:test";
import {
  savedPage,
  savedList,
  savedProspects,
  listId,
} from "../lib/workspace/saved-lists";
import { dashboardDestination } from "../lib/workspace/config";
import { localConfig, setupPrompt } from "../lib/workspace/setup";
const id = "c6aede99-e28c-4f6d-91fa-2cc069c371ac",
  sid = "0123456789abcdefg";
const a = { username: "sale", accountId: "owner", accessToken: "test-only" };
const json = (v: unknown) => Response.json(v);
test("both client families resolve only owned known storage and next-key pagination", async () => {
  for (const [family, store, prefix] of [
    ["local", "vibeleads-mcp-state", "leads."],
    ["prospecting-secondary", "vibeleads-mcp-state-2", "lsleads."],
  ] as const) {
    const get = async (p: string, t: string) => {
      assert.equal(t, a.accessToken);
      if (p.includes("~"))
        return json({ data: { id: sid, userId: "owner", name: store } });
      if (p.includes("/keys?")) {
        assert.ok(p.includes("exclusiveStartKey=" + prefix + id));
        return json({
          data: {
            items: [{ key: prefix + id }, { key: "secret" }],
            nextExclusiveStartKey: prefix + id,
            isTruncated: true,
          },
        });
      }
      return json({
        id,
        request: { niche: "Design studios", area: "Chicago" },
      });
    };
    const data = await savedPage(get, a, family, id);
    assert.equal(data.items[0].name, "Design studios · Chicago");
    assert.equal(data.items.length, 1);
    assert.equal(data.next, id);
  }
});
test("foreign, absent and invalid storage cannot expose records", async () => {
  let requests = 0;
  const foreign = async () => {
    requests++;
    return json({
      data: { id: sid, userId: "another-account", name: "vibeleads-mcp-state" },
    });
  };
  await assert.rejects(savedList(foreign, a, "local", id));
  assert.equal(requests, 1);
  assert.equal(await savedList(foreign, a, "local", "../secret"), null);
  assert.equal(requests, 1);
  assert.equal(
    await savedList(
      async () => {
        throw Object.assign(new Error(), { status: 404 });
      },
      a,
      "local",
      id,
    ),
    null,
  );
  assert.equal(listId("jobs.index"), false);
});
test("underlying result arrays exclude plan, error and administrative envelopes", () => {
  assert.deepEqual(
    savedProspects([
      { name: "A", sourceUrl: "javascript:bad", phone: "012", raw: "unneeded" },
      { tool: "plan", name: "Plan" },
      { ok: true, result: { name: "A" } },
      { error: "failed" },
      { x: 2 },
    ]),
    [{ name: "A", phone: "012" }],
  );
  assert.throws(() => savedProspects({ result: {} }));
});
test("marketing dashboard links preserve view and deep path without forwarding credentials", () => {
  const to = dashboardDestination(
    new URL(
      "https://www.vibeleads.app/workspace/runs/abc?page=2&token=private",
    ),
    new URL("https://vibeleads-ten.vercel.app"),
  );
  assert.equal(
    to?.href,
    "https://vibeleads-ten.vercel.app/workspace/runs/abc?page=2",
  );
  assert.equal(
    dashboardDestination(new URL("https://unrelated.example/workspace")),
    null,
  );
  assert.equal(
    dashboardDestination(new URL("https://vibeleads.app/auth/apify/callback")),
    null,
  );
});
test("local client restarts reuse setup without embedding a credential", () => {
  const local = JSON.parse(localConfig(true)).mcpServers.vibeleads;
  assert.equal(local.command, "npx");
  assert.ok(local.args.includes("Authorization: Bearer ${APIFY_TOKEN}"));
  assert.ok(!localConfig(false).includes("Bearer"));
  assert.ok(setupPrompt.includes("before starting any paid work"));
});

test("saved people retain work address and status, signals retain publisher evidence and never enter contact coverage", async () => {
  const response = [
    {
      kind: "person",
      name: "Taylor",
      workEmail: "taylor@example.org",
      emailStatus: "catch_all",
      location: "NY",
      whyNow: [
        { label: "Hiring", proof: "Official opening", internal: "omit" },
      ],
    },
    {
      kind: "creator",
      handle: "studio",
      profileUrl: "https://example.org/studio",
      followers: 30,
    },
    {
      kind: "post",
      platform: "Reddit",
      author: "producer",
      text: "Seeking a freelance editor",
      url: "https://example.org/post",
      postedAt: "2026-11-20",
      community: "editing",
    },
    {
      name: "Dental practice",
      whyTheyNeedYou: ["Slow mobile site", "No contact form"],
    },
    { kind: "post", text: "No source or author" },
    { name: "Control", quoteId: "q" },
  ];
  const get = async (p: string) =>
    p.includes("~")
      ? json({
          data: { id: sid, name: "vibeleads-mcp-state", userId: "owner" },
        })
      : p.includes("records/lsleads.")
        ? json(response)
        : json({ id });
  const loaded = await savedList(get, a, "prospecting", id);
  const rows = loaded?.rows ?? [];
  assert.equal(rows.length, 4);
  assert.equal(rows[0].email, "taylor@example.org");
  assert.equal(rows[0].emailStatus, "catch_all");
  assert.equal(rows[0].whyNow, "Hiring: Official opening");
  assert.equal(rows[2].kind, "post");
  assert.equal(rows[2].postedAt, "2026-11-20");
  assert.match(String(rows[3].whyTheyNeedYou), /No contact form/);
  const { contactSummary } = await import("../lib/workspace/table");
  assert.equal(contactSummary(rows.filter((x) => x.kind !== "post")).total, 3);
  assert.equal(contactSummary(rows).email, 1);
  const { datasetCsv } = await import("../lib/workspace/data-view");
  assert.match(datasetCsv(rows), /taylor@example.org/);
  assert.match(datasetCsv(rows), /Seeking a freelance editor/);
});

test("oversize lists stream the exact selected JSON only after checking storage ownership", async () => {
  const { savedDownload } = await import("../lib/workspace/saved-lists");
  const paths: string[] = [];
  const body = '[{"name":"One exact record"}]';
  const get = async (p: string) => {
    paths.push(p);
    return p.includes("~")
      ? json({
          data: { id: sid, name: "vibeleads-mcp-state", userId: "owner" },
        })
      : new Response(body);
  };
  const res = await savedDownload(get, a, "local", id);
  assert.match(res!.headers.get("content-disposition")!, /attachment/);
  assert.equal(await res!.text(), body);
  assert.equal(
    paths.at(-1),
    "key-value-stores/" + sid + "/records/leads." + id,
  );
  const oversize = await savedList(
    async (p) =>
      p.includes("/records/leads.")
        ? new Response("[]", { headers: { "content-length": "5000000" } })
        : get(p),
    a,
    "local",
    id,
  );
  assert.equal(oversize?.rows, null);
});

test("reported fit and checked mail never promote unscored records, signals or catch-all mailboxes", async () => {
  const { salesSummary } = await import("../lib/workspace/saved-lists");
  const s = salesSummary([
    {
      kind: "person",
      email: "buyer@example.org",
      emailStatus: "verified",
      priority: "hot",
    },
    { email: "catch@example.org", emailStatus: "catch_all", priority: "warm" },
    { email: "unknown@example.org", emailStatus: "unknown" },
    {
      kind: "post",
      email: "poster@example.org",
      emailStatus: "verified",
      priority: "hot",
    },
    { name: "No score or email" },
  ]);
  assert.equal(s.emailOnFile, 3);
  assert.equal(s.passedEmailCheck, 1);
  assert.deepEqual(
    s.groups.map((x) => x[1]),
    [1, 1, 0],
  );
  assert.equal(s.ranked, 2);
  assert.deepEqual(
    salesSummary([{ score: 71 }, { score: 45 }, { score: -1 }]).groups.map(
      (x) => x[1],
    ),
    [1, 1, 0],
  );
  assert.deepEqual(salesSummary([{ name: "Unknown" }]).groups, []);
});
