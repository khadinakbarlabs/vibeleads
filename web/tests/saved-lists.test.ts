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
