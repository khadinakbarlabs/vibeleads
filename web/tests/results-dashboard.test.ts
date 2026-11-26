import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapResults,
  workflowName,
  outcome,
  resultTitle,
  rowName,
} from "../lib/workspace/results";

test("lead envelopes produce individual records and preserve their evidence", () => {
  const data = mapResults([
    {
      tool: "get_leads",
      result: {
        leads: [
          { name: "Elm", score: 0, socials: { website: "example.org" } },
          { name: "Oak", priority: "hot" },
        ],
        planningCall: { prompt: "hidden" },
      },
    },
  ]);
  assert.equal(data.length, 2);
  assert.equal(data[0].score, 0);
  assert.equal(data[1].name, "Oak");
  assert.deepEqual(data[0].socials, { website: "example.org" });
});
test("planning answers expose customer outcomes without publishing assistant instructions", () => {
  const data = mapResults([
    {
      tool: "route_prospecting",
      ok: true,
      result: {
        status: "REVIEW_GUIDANCE",
        guidance: { prompt: "hidden" },
        planningCall: {},
        approaches: [{ title: "Review readiness", prompt: "hidden" }],
      },
    },
  ]);
  assert.equal(data.length, 1);
  assert(!JSON.stringify(data).includes("hidden"));
  assert.match(JSON.stringify(data), /Review readiness/);
});
test("empty lead lists remain empty; outcome and workflow labels describe real runs", () => {
  assert.equal(
    mapResults([{ tool: "get_leads", result: { leads: [] } }]).length,
    0,
  );
  assert.equal(workflowName("route_prospecting"), "Prospecting plan");
  assert.equal(outcome("TIMED-OUT"), "Needs attention");
});
test("native lead exports restore records including quoted business names", () => {
  const records = mapResults([
    {
      tool: "export_leads",
      result: { csv: 'name,phone\r\n"Clinic, West","123"' },
    },
  ]);
  assert.deepEqual(records, [{ name: "Clinic, West", phone: "123" }]);
});
test("jobs runs show a plain shortlist status and keep delivered job rows", () => {
  const quoted = mapResults([
    {
      ok: true,
      result: {
        status: "QUOTED",
        quoteId: "q-1",
        board: "example",
        maxEventChargeUsd: 0.0162,
        authorization: { account: "hidden-account" },
        filters: { boardTokens: ["example"] },
      },
    },
  ]);
  assert.equal(quoted.length, 1);
  assert.equal(quoted[0].workflow, "Jobs shortlist");
  assert.equal(quoted[0].status, "Quote ready for approval");
  assert.equal(quoted[0].mostItCanCost, "$0.0162");
  assert(!JSON.stringify(quoted).includes("hidden-account"));
  const failed = mapResults([
    {
      ok: true,
      result: {
        status: "NO_ELIGIBLE_JOBS_IN_SAMPLE",
        quoteId: "q-2",
        parentChargeUsd: 0,
      },
    },
  ]);
  assert.equal(failed[0].status, "No matching jobs");
  assert.equal(failed[0].charged, "$0");
  const jobs = mapResults([
    {
      title: "Designer",
      company: "Example",
      applyUrl: "https://example.org/apply",
    },
  ]);
  assert.equal(jobs[0].title, "Designer");
  assert.equal(workflowName("greenhouse_jobs"), "Jobs shortlist");
});
test("run titles name jobs shortlists and keep lead titles", () => {
  assert.equal(
    resultTitle([{ title: "Designer", applyUrl: "https://example.org" }]),
    "Jobs shortlist",
  );
  assert.equal(
    resultTitle([{ ok: true, result: { status: "QUOTED", quoteId: "q" } }]),
    "Jobs shortlist",
  );
  assert.equal(resultTitle([{ name: "Elm" }]), "Lead results");
  assert.equal(resultTitle([{ tool: "plan_leads" }]), "Lead search estimate");
  assert.equal(resultTitle([]), "Workflow results");
});
test("job rows are named by their title", () => {
  assert.equal(
    rowName({
      title: "Designer",
      company: "Example",
      applyUrl: "https://example.org",
    }),
    "Designer",
  );
  assert.equal(rowName({ company: "Example" }), "Example");
});
