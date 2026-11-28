import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTOR_ID } from "../lib/workspace/config";
import { datasetCsv } from "../lib/workspace/data-view";
import { sellerRunResults } from "../lib/workspace/run-results";
import { currentSelection, emptyView } from "../lib/workspace/table";

const account = {
  username: "seller",
  accountId: "owner",
  accessToken: "fixture-only",
};
const run = {
  actId: ACTOR_ID,
  userId: "owner",
  defaultKeyValueStoreId: "runarchive00000001",
};
const list = "109caac6-423a-4cb3-855e-cbad7b965207";
const primary = "state000000000001";
const secondary = "state000000000002";
const names = ["vibeleads-mcp-state", "vibeleads-mcp-state-2"];
const rows = [
  { leadId: "left", name: "Opted out later", email: "old@example.org" },
  {
    leadId: "kept",
    name: "Still visible",
    email: "hello@other.org",
    emailStatus: "verified",
    status: "unmarked",
  },
];
function accountReader(records: Map<string, unknown>, requests: string[]) {
  return async (path: string, token: string) => {
    assert.equal(token, account.accessToken);
    requests.push(path);
    const [, store, operation, key] = path.split("/");
    const index = names.indexOf(store.replace("seller~", ""));
    if (index >= 0)
      return Response.json({
        data: {
          id: [primary, secondary][index],
          userId: "owner",
          name: names[index],
        },
      });
    if (operation?.startsWith("keys?")) {
      const prefix = new URLSearchParams(operation.slice(5)).get("prefix");
      const items = [...records.keys()]
        .filter((k) => k.startsWith(store + "/" + prefix))
        .map((k) => ({ key: k.slice(store.length + 1) }));
      return Response.json({ data: { items, isTruncated: false } });
    }
    if (operation === "records" && records.has(store + "/" + key))
      return Response.json(records.get(store + "/" + key));
    throw Object.assign(new Error("Missing fixture record"), { status: 404 });
  };
}
test("an older run preview and seller CSV use later opt-outs and CRM, including a fallback-store opt-out", async () => {
  const original = structuredClone(rows);
  const records = new Map<string, unknown>([
    [
      run.defaultKeyValueStoreId + "/RUN_SUMMARY",
      { listId: list, stateStore: names[0] },
    ],
    [
      primary + "/crm-mark." + list + ".kept",
      {
        listId: list,
        leadId: "kept",
        status: "replied",
        at: "2026-11-28T00:00:00Z",
      },
    ],
  ]);
  const requests: string[] = [];
  const get = accountReader(records, requests);
  const selectedBeforeOptOut = new Set(
    await sellerRunResults(get, account, run, rows),
  );
  assert.equal(selectedBeforeOptOut.size, 2);
  records.set(secondary + "/dnc.v1", {
    entries: [{ value: "old@example.org" }],
  });
  const visible = await sellerRunResults(get, account, run, rows);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].status, "replied");
  assert.equal(visible[0].emailStatus, "shared-inbox");
  assert.deepEqual(
    currentSelection(visible, emptyView, selectedBeforeOptOut),
    visible,
  );
  assert.doesNotMatch(datasetCsv(visible), /Opted out later|old@example.org/);
  assert.match(datasetCsv(visible), /Still visible/);
  assert.deepEqual(rows, original);
  assert.ok(
    requests.includes(
      "key-value-stores/" + run.defaultKeyValueStoreId + "/records/RUN_SUMMARY",
    ),
  );
});
test("legacy CSV envelopes and job application URLs also honor current policy without an originating list", async () => {
  const records = new Map([
    [
      primary + "/dnc.v1",
      {
        entries: [
          { value: "example.org" },
          { value: "x:publisher" },
          { value: "https://www.linkedin.com/in/archived-maker" },
        ],
      },
    ],
  ]);
  const requests: string[] = [];
  const view = await sellerRunResults(
    accountReader(records, requests),
    account,
    run,
    [
      {
        tool: "export_leads",
        result: {
          csv: "name,email\r\nGone,one@example.org\r\nKeep,two@other.org",
        },
      },
      { title: "Gone job", applyUrl: "https://apply.example.org/edit" },
      { name: "Historical maker", socialLinks: ["https://x.com/publisher"] },
      {
        name: "Historical local business",
        socials: { linkedin: "https://www.linkedin.com/in/archived-maker" },
      },
      { publisher: "media.example", contactCandidates: ["old@example.org"] },
    ],
  );
  assert.deepEqual(
    view.map((row) => row.name),
    ["Keep"],
  );
  assert.equal(
    requests.some(
      (path) => path.includes("crm-mark.") || path.includes("feedback."),
    ),
    false,
  );
});
test("an unavailable policy prevents results from returning", async () => {
  const unavailable = async () => {
    throw Object.assign(new Error("Policy unavailable"), { status: 503 });
  };
  await assert.rejects(
    sellerRunResults(unavailable, account, run, rows),
    /Policy unavailable/,
  );
});
test("historical buyer cards demote expired routes and retain distinct cost and business receipts", async () => {
  const checkedAt = "2026-11-25T09:00:00Z";
  const original = {
    url: "https://buyer.example/brief",
    route: "application",
    applicationUrl: "https://buyer.example/apply",
    checkedAt,
    routeCheckedAt: checkedAt,
  };
  const buyer = {
    signalId: "sig",
    status: "actionable",
    score: 88,
    deadline: "2026-11-27T20:00:00Z",
    original,
    evidence: {
      originalUrl: original.url,
      next: "Apply now",
      responseUrl: original.applicationUrl,
    },
  };
  const get = accountReader(new Map(), []);
  const cards = [
    {
      tool: "seller_project",
      result: {
        projectId: "one",
        rows: [buyer],
        costs: { totalUsd: null },
        businessResults: {
          applicationInvitations: 1,
          verifiedIndividualEmails: null,
        },
      },
    },
  ];
  const [expired, receipt] = await sellerRunResults(
    get,
    account,
    run,
    cards,
    Date.parse("2026-11-28T09:00:00Z"),
  );
  assert.equal(expired.status, "closed");
  assert.equal(expired.score, null);
  assert.doesNotMatch(
    JSON.stringify(expired),
    /Apply now|buyer.example\/apply/,
  );
  assert.deepEqual(receipt.costsAtRun, { totalUsd: null });
  assert.deepEqual(receipt.businessResultsAtRun, {
    applicationInvitations: 1,
    verifiedIndividualEmails: null,
  });
  const [unverified] = await sellerRunResults(
    get,
    account,
    run,
    cards,
    Date.parse("2026-11-26T09:00:00Z"),
  );
  assert.equal(unverified.status, "needs_recheck");
  const [recent] = await sellerRunResults(
    get,
    account,
    run,
    cards,
    Date.parse("2026-11-25T10:00:00Z"),
  );
  assert.equal(recent.status, "actionable_at_last_check");
  assert.equal(
    (recent.evidence as Record<string, unknown>).responseUrl,
    original.applicationUrl,
  );
  const policy = new Map([
    [primary + "/dnc.v1", { entries: [{ value: "employer.example" }] }],
  ]);
  const decision = [
    {
      tool: "seller_project",
      result: {
        costs: { totalUsd: 0 },
        sellerNext: {
          kind: "respond",
          card: {
            ...buyer.evidence,
            status: "actionable",
            originalUrl: "https://forum.example/request",
            responseUrl: "https://employer.example/apply",
            checkedAt,
            routeCheckedAt: checkedAt,
            route: "application",
          },
        },
      },
    },
  ];
  const filtered = await sellerRunResults(
    accountReader(policy, []),
    account,
    run,
    decision,
    Date.parse("2026-11-25T10:00:00Z"),
  );
  assert.deepEqual(
    filtered.map((r) => r.workflow),
    ["Seller project costs at the time of this run"],
  );
});
test("native pitch prospects and itemized source costs survive historical CSV and JSON projections", async () => {
  const data = [
    {
      tool: "seller_project",
      result: {
        costs: { totalUsd: 0.01 },
        lines: [{ source: "included", knownUsd: 0, usable: 1 }],
      },
    },
    {
      tool: "prepare_backlink_campaign",
      result: {
        status: "REVIEW",
        opportunities: [
          {
            publisher: "studio.example",
            sourceUrl: "https://studio.example/blog",
          },
        ],
      },
    },
    {
      tool: "seller_project",
      result: {
        costs: { totalUsd: null },
        sellerNext: {
          kind: "wait",
          reason: "The saved searches were checked recently.",
          retryAt: "2026-11-29T00:00:00Z",
        },
      },
    },
  ];
  const visible = await sellerRunResults(
    accountReader(new Map(), []),
    account,
    run,
    data,
  );
  assert.equal(visible.length, 4);
  assert.equal(visible[1].knownUsd, 0);
  assert.equal(visible[2].publisher, "studio.example");
  assert.equal(visible[2].prospectType, "Publisher to review for a pitch");
  assert.deepEqual(visible[3].decisionAtRun, {
    kind: "wait",
    reason: "The saved searches were checked recently.",
    retryAt: "2026-11-29T00:00:00Z",
  });
  assert.match(datasetCsv(visible), /studio.example/);
});
