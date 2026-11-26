export const RUN_STATUSES = [
  "READY",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "TIMING-OUT",
  "TIMED-OUT",
  "ABORTING",
  "ABORTED",
] as const;

export function historyStatus(value: unknown) {
  return RUN_STATUSES.find((status) => status === value);
}

export function pageNumber(value: unknown) {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,2}$/.test(value)) return 1;
  return Number(value);
}

export function statusLabel(status: string) {
  const text = status.toLowerCase().replaceAll("-", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function runDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf())
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)
    : "—";
}

export type DataRow = Record<string, unknown>;

export function isOwnedRun(
  run: { actId: string; userId?: string },
  actorId: string,
  accountId: string,
) {
  return run.userId === accountId && run.actId === actorId;
}

const preferred = [
  "businessName",
  "name",
  "title",
  "company",
  "location",
  "applyUrl",
  "website",
  "email",
  "phone",
  "score",
  "tool",
  "ok",
  "result",
  "sourceUrl",
];

export function columns(rows: DataRow[]) {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  return [...preferred.filter((key) => keys.delete(key)), ...keys].slice(0, 8);
}

export function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function datasetCsv(rows: DataRow[]) {
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!fields.length) return "";
  const escape = (value: unknown) => {
    const text = cellText(value);
    const safe =
      typeof value === "string" &&
      /^[\u0000-\u0020]*[=+@-]|^[\t\r\n]/.test(text)
        ? "'" + text
        : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return [
    fields.map(escape).join(","),
    ...rows.map((row) =>
      fields
        .map((key) => escape(Object.hasOwn(row, key) ? row[key] : ""))
        .join(","),
    ),
  ].join("\r\n");
}
