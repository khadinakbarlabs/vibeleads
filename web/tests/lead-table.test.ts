import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyView,
  contactSummary,
  defaultVisible,
  emptyView,
  facets,
  pickColumns,
  tableColumns,
} from "../lib/workspace/table";

const rows = [
  {
    businessName: "Juniper Dental",
    city: "Austin",
    email: "hi@juniper.example",
    score: 72,
    priority: "hot",
    socials: { ig: "x" },
  },
  {
    businessName: "Cedar Grove",
    city: "Dallas",
    phone: "555-0114",
    score: 40,
    priority: "warm",
  },
  {
    businessName: "Lakeview",
    city: "Austin",
    email: "office@lakeview.example",
    website: "https://lakeview.example",
    priority: "cold",
  },
];

test("columns put the useful lead fields first and label them plainly", () => {
  const columns = tableColumns(rows);
  assert.deepEqual(
    columns.slice(0, 3).map((c) => c.label),
    ["Business", "City", "Email"],
  );
  assert.equal(columns.find((c) => c.key === "score")?.kind, "number");
  assert.equal(columns.find((c) => c.key === "website")?.kind, "link");
  assert.equal(columns.find((c) => c.key === "socials")?.kind, "list");
  assert(!defaultVisible(columns, rows).includes("socials"));
});

test("search, dropdown filters, contact filters and minimum score combine", () => {
  assert.equal(applyView(rows, { ...emptyView, query: "lakeview" }).length, 1);
  assert.equal(
    applyView(rows, { ...emptyView, filters: { city: "Austin" } }).length,
    2,
  );
  assert.equal(applyView(rows, { ...emptyView, has: ["email"] }).length, 2);
  assert.equal(
    applyView(rows, { ...emptyView, has: ["email", "website"] }).length,
    1,
  );
  assert.deepEqual(
    applyView(rows, { ...emptyView, minScore: 50 }).map((r) => r.businessName),
    ["Juniper Dental"],
  );
});

test("sorting works both ways and always keeps empty values last", () => {
  const up = applyView(rows, {
    ...emptyView,
    sort: { key: "score", dir: "asc" },
  });
  assert.deepEqual(
    up.map((r) => r.businessName),
    ["Cedar Grove", "Juniper Dental", "Lakeview"],
  );
  const down = applyView(rows, {
    ...emptyView,
    sort: { key: "score", dir: "desc" },
  });
  assert.deepEqual(
    down.map((r) => r.businessName),
    ["Juniper Dental", "Cedar Grove", "Lakeview"],
  );
  assert.equal(
    rows[0].businessName,
    "Juniper Dental",
    "sorting must not change the original list",
  );
});

test("dropdown filters come from columns with a few repeated values", () => {
  const found = facets(rows, tableColumns(rows));
  assert.deepEqual(found.find((f) => f.key === "city")?.values, [
    "Austin",
    "Dallas",
  ]);
  assert(!found.some((f) => f.key === "businessName" && f.values.length > 12));
});

test("exports keep only the chosen columns with readable headers", () => {
  const out = pickColumns(rows.slice(0, 1), ["businessName", "email"]);
  assert.deepEqual(out, [
    { Business: "Juniper Dental", Email: "hi@juniper.example" },
  ]);
});

test("summary counts contacts and averages scores", () => {
  assert.deepEqual(contactSummary(rows), {
    total: 3,
    email: 2,
    phone: 1,
    website: 1,
    averageScore: 56,
  });
});
