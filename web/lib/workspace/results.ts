import { parse } from "csv-parse/sync";
import type { DataRow } from "./data-view";

const names: Record<string, string> = {
  route_prospecting: "Prospecting plan",
  plan_leads: "Lead search estimate",
  find_leads: "Lead discovery",
  get_leads: "Lead list",
  run_playbook: "Prospecting workflow",
  run_workflow: "Custom workflow",
  analyze_website: "Website analysis",
  export_leads: "Lead export",
  clean_list: "List enrichment",
  lead_status: "Lead list progress",
  start: "Workspace overview",
  suggest_workflow: "Workflow recommendations",
  mark_lead: "Lead update",
  schedule_leads: "Scheduled lead search",
  inspect_capabilities: "Available workflows",
  compose_prospecting: "Workflow design",
  greenhouse_jobs: "Jobs shortlist",
};
export function humanize(key: string) {
  const s = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function workflowName(tool?: string) {
  return tool
    ? Object.hasOwn(names, tool)
      ? names[tool]
      : humanize(tool)
    : "Workflow run";
}
export function outcome(status: string) {
  if (status === "SUCCEEDED") return "Completed";
  if (["READY", "RUNNING"].includes(status)) return "In progress";
  return "Needs attention";
}
export function record(v: unknown): v is DataRow {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const collections = [
  "leads",
  "rows",
  "items",
  "jobs",
  "results",
  "contacts",
  "companies",
];
// For control responses surface only customer-facing outcome fields. Lead rows retain their business data.
const jobStatus: Record<string, string> = {
  READY: "Ready",
  REVIEW_PLAN: "Plan ready for review",
  BOARD_NEEDED: "Needs an employer board",
  QUOTED: "Quote ready for approval",
  AWAITING_APPROVAL: "Waiting for approval",
  SOURCE_STARTED: "Searching the board",
  START_PENDING: "Search starting",
  BILLING_RECONCILIATION: "Receipt being checked",
  DELIVERED: "Delivered",
  NO_JOBS_IN_SAMPLE: "No jobs found",
  NO_ELIGIBLE_JOBS_IN_SAMPLE: "No matching jobs",
  PARTIAL_SOURCE: "Board only partly read",
};
// Jobs runs write either job rows or a single {ok, result} envelope without a tool name.
export function isJobsEnvelope(row: DataRow) {
  const result = record(row.result) ? row.result : null;
  return (
    typeof row.tool !== "string" &&
    typeof row.ok === "boolean" &&
    !!result &&
    typeof result.status === "string" &&
    ("board" in result || "quoteId" in result || "boardUrl" in result)
  );
}
function jobsSummary(row: DataRow): DataRow {
  const result = record(row.result) ? row.result : {};
  const item: DataRow = { workflow: "Jobs shortlist" };
  const status = typeof result.status === "string" ? result.status : "";
  if (status) item.status = jobStatus[status] ?? humanize(status);
  const usd = (value: unknown) =>
    typeof value === "number" ? "$" + Number(value.toFixed(4)) : undefined;
  if (typeof result.board === "string") item.board = result.board;
  if (typeof result.quoteId === "string") item.quoteId = result.quoteId;
  const most = usd(result.maxEventChargeUsd);
  if (most) item.mostItCanCost = most;
  const charged = usd(result.parentChargeUsd);
  if (charged) item.charged = charged;
  if (typeof result.next === "string") item.next = result.next;
  if (!row.ok && typeof row.message === "string") item.message = row.message;
  item.outcome = row.ok ? "Completed" : "Needs attention";
  return item;
}
export function mapResults(rows: DataRow[]): DataRow[] {
  return rows.flatMap((row) => {
    if (isJobsEnvelope(row)) return [jobsSummary(row)];
    if (typeof row.tool !== "string") return [row];
    const result = record(row.result) ? row.result : {};
    if (row.tool === "export_leads" && typeof result.csv === "string") {
      try {
        return parse(result.csv, {
          columns: true,
          bom: true,
          skip_empty_lines: true,
        }) as DataRow[];
      } catch {
        /* Preserve the workflow summary for an older malformed export. */
      }
    }
    for (const key of collections) {
      const list = result[key];
      if (Array.isArray(list) && list.every(record)) return list;
    }
    const item: DataRow = { workflow: workflowName(row.tool) };
    for (const key of [
      "status",
      "stage",
      "listName",
      "listId",
      "total",
      "count",
      "delivered",
      "usageUsd",
      "currency",
      "filename",
      "summary",
      "estimate",
      "stats",
      "checked",
      "savedLists",
      "schedules",
      "cost",
      "scope",
      "message",
    ]) {
      if (
        (key !== "message" ||
          !["start", "get_agent_guide"].includes(row.tool)) &&
        result[key] != null
      )
        item[key] = result[key];
    }
    if (typeof row.message === "string") item.message = row.message;
    if (Array.isArray(result.approaches))
      item.options = result.approaches
        .filter(record)
        .map((x) => x.title)
        .filter((x) => typeof x === "string");
    if (typeof row.ok === "boolean")
      item.outcome = row.ok ? "Completed" : "Needs attention";
    return [item];
  });
}
export function resultTitle(rows: DataRow[]) {
  const first = rows[0];
  if (!first) return "Workflow results";
  if (typeof first.tool === "string") return workflowName(first.tool);
  if (isJobsEnvelope(first) || "applyUrl" in first) return "Jobs shortlist";
  return "Lead results";
}
export function isJobRow(row: DataRow) {
  return typeof row.applyUrl === "string" && typeof row.title === "string";
}
export function rowName(row: DataRow) {
  if (isJobRow(row)) return String(row.title);
  return String(
    row.businessName ||
      row.name ||
      row.companyName ||
      row.company ||
      row.title ||
      row.domain ||
      row.website ||
      row.email ||
      row.workflow ||
      "Result",
  );
}
export function duration(start: string, end?: string | null) {
  if (!end) return "—";
  const n = Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 1000),
  );
  if (!Number.isFinite(n)) return "—";
  return n < 60 ? n + "s" : Math.floor(n / 60) + "m " + (n % 60) + "s";
}
