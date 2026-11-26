import type { DataRow } from "./data-view";
import { humanize } from "./results";

export type ColumnKind = "text" | "number" | "link" | "email" | "list";
export interface Column {
  key: string;
  label: string;
  kind: ColumnKind;
}
export type SortDir = "asc" | "desc";
export interface TableView {
  query: string;
  filters: Record<string, string>;
  has: string[];
  minScore: number | null;
  sort: { key: string; dir: SortDir } | null;
}
export const emptyView: TableView = {
  query: "",
  filters: {},
  has: [],
  minScore: null,
  sort: null,
};

const labels: Record<string, string> = {
  businessName: "Business",
  name: "Name",
  title: "Title",
  company: "Company",
  companyName: "Company",
  applyUrl: "Apply link",
  boardSourceUrl: "Board",
  firstPublishedAt: "Posted",
  observedAt: "Checked",
  searchedCity: "City",
  phone: "Phone",
  email: "Email",
  website: "Website",
  score: "Score",
  priority: "Priority",
  category: "Category",
  city: "City",
  location: "Location",
  rating: "Rating",
  reviewsCount: "Reviews",
  pitch: "Pitch",
  sourceUrl: "Source",
};
const preferred = [
  "businessName",
  "name",
  "title",
  "company",
  "companyName",
  "category",
  "city",
  "searchedCity",
  "location",
  "email",
  "phone",
  "website",
  "score",
  "priority",
  "rating",
  "reviewsCount",
  "pitch",
  "applyUrl",
  "firstPublishedAt",
  "sourceUrl",
];
// Contact presence filters a lead list usually needs.
export const CONTACT_KEYS = ["email", "phone", "website"] as const;

export function label(key: string) {
  return labels[key] ?? humanize(key);
}

function kindOf(key: string, values: unknown[]): ColumnKind {
  const present = values.filter((v) => v != null && v !== "");
  if (present.length && present.every((v) => typeof v === "number"))
    return "number";
  if (present.some((v) => Array.isArray(v) || (v && typeof v === "object")))
    return "list";
  if (key.toLowerCase().includes("email")) return "email";
  if (
    present.length &&
    present.every((v) => typeof v === "string" && /^https?:\/\//i.test(v))
  )
    return "link";
  return "text";
}

export function tableColumns(rows: DataRow[]): Column[] {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  const ordered = [
    ...preferred.filter((key) => keys.delete(key)),
    ...[...keys].sort(),
  ];
  return ordered.map((key) => ({
    key,
    label: label(key),
    kind: kindOf(
      key,
      rows.map((r) => r[key]),
    ),
  }));
}

// Columns shown before the user picks their own: the useful, mostly-filled ones.
export function defaultVisible(columns: Column[], rows: DataRow[], max = 7) {
  const filled = (key: string) =>
    rows.filter((r) => r[key] != null && r[key] !== "").length;
  return columns
    .filter((c) => c.kind !== "list" && filled(c.key) > 0)
    .filter(
      (c) => preferred.includes(c.key) || filled(c.key) >= rows.length / 2,
    )
    .slice(0, max)
    .map((c) => c.key);
}

export function cellText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(cellText).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Text columns with a few repeated values make good dropdown filters.
export function facets(rows: DataRow[], columns: Column[], maxValues = 12) {
  const out: { key: string; label: string; values: string[] }[] = [];
  for (const column of columns) {
    if (column.kind !== "text") continue;
    const values = new Set<string>();
    let filled = 0;
    for (const row of rows) {
      const v = row[column.key];
      if (typeof v !== "string" || !v.trim()) continue;
      filled++;
      values.add(v.trim());
      if (values.size > maxValues) break;
    }
    if (values.size >= 2 && values.size <= maxValues && filled >= 2)
      out.push({
        key: column.key,
        label: column.label,
        values: [...values].sort((a, b) => a.localeCompare(b)),
      });
  }
  return out;
}

function compare(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return cellText(a).localeCompare(cellText(b), undefined, { numeric: true });
}

export function applyView(rows: DataRow[], view: TableView): DataRow[] {
  const query = view.query.trim().toLowerCase();
  const result = rows.filter((row) => {
    for (const [key, value] of Object.entries(view.filters))
      if (value && cellText(row[key]).trim() !== value) return false;
    for (const key of view.has) if (!cellText(row[key]).trim()) return false;
    if (view.minScore != null) {
      const score = row.score;
      if (typeof score !== "number" || score < view.minScore) return false;
    }
    if (query && !JSON.stringify(row).toLowerCase().includes(query))
      return false;
    return true;
  });
  if (view.sort) {
    const { key, dir } = view.sort;
    const empty = (v: unknown) => v == null || v === "";
    // Empty values always sink to the bottom, whatever the direction.
    result.sort((a, b) => {
      if (empty(a[key]) !== empty(b[key])) return empty(a[key]) ? 1 : -1;
      if (empty(a[key])) return 0;
      const order = compare(a[key], b[key]);
      return dir === "asc" ? order : -order;
    });
  }
  return result;
}

export function pickColumns(rows: DataRow[], keys: string[]): DataRow[] {
  return rows.map((row) =>
    Object.fromEntries(keys.map((key) => [label(key), row[key] ?? ""])),
  );
}

export function contactSummary(rows: DataRow[]) {
  const count = (key: string) =>
    rows.filter((r) => cellText(r[key]).trim()).length;
  const scores = rows
    .map((r) => r.score)
    .filter((s): s is number => typeof s === "number");
  return {
    total: rows.length,
    email: count("email"),
    phone: count("phone"),
    website: count("website"),
    averageScore: scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null,
  };
}
