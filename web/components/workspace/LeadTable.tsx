"use client";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  RotateCcw,
  Search,
} from "lucide-react";
import { datasetCsv, type DataRow } from "@/lib/workspace/data-view";
import {
  applyView,
  cellText,
  CONTACT_KEYS,
  contactSummary,
  defaultVisible,
  emptyView,
  facets,
  label,
  pickColumns,
  tableColumns,
  type Column,
  type TableView,
} from "@/lib/workspace/table";

const PAGE_SIZES = [25, 50, 100];

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  a.click();
  URL.revokeObjectURL(url);
}

function shortLink(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname.replace(/^www\./, "") + (url.pathname.length > 1 ? "/…" : "")
    );
  } catch {
    return value;
  }
}

function Cell({ column, value }: { column: Column; value: unknown }) {
  const text = cellText(value);
  if (!text) return <span className="lt-empty">—</span>;
  if (column.kind === "link" && typeof value === "string")
    return (
      <a href={value} target="_blank" rel="noreferrer" className="lt-link">
        {shortLink(value)}
      </a>
    );
  if (column.kind === "email")
    return (
      <a href={"mailto:" + text} className="lt-link">
        {text}
      </a>
    );
  if (column.key === "priority")
    return <span className={"lt-pill lt-" + text.toLowerCase()}>{text}</span>;
  if (column.key.endsWith("At") && !Number.isNaN(Date.parse(text)))
    return (
      <>{new Date(text).toLocaleDateString("en", { dateStyle: "medium" })}</>
    );
  return <span title={text.length > 60 ? text : undefined}>{text}</span>;
}

function Detail({ row }: { row: DataRow }) {
  return (
    <dl className="lt-detail">
      {Object.entries(row).map(([key, value]) => (
        <div key={key}>
          <dt>{label(key)}</dt>
          <dd>
            {typeof value === "string" && /^https?:\/\//i.test(value) ? (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="lt-link"
              >
                {value}
              </a>
            ) : (
              cellText(value) || "—"
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LeadTable({
  rows,
  filename,
}: {
  rows: DataRow[];
  filename: string;
}) {
  const columns = useMemo(() => tableColumns(rows), [rows]);
  const filters = useMemo(
    () => facets(rows, columns).slice(0, 4),
    [rows, columns],
  );
  const contactKeys = CONTACT_KEYS.filter((k) =>
    columns.some((c) => c.key === k),
  );
  const hasScore = columns.some(
    (c) => c.key === "score" && c.kind === "number",
  );
  const [visible, setVisible] = useState(() => defaultVisible(columns, rows));
  const [view, setView] = useState<TableView>(emptyView);
  const [selected, setSelected] = useState<Set<DataRow>>(new Set());
  const [open, setOpen] = useState<DataRow | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const shown = useMemo(() => applyView(rows, view), [rows, view]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = shown.slice((current - 1) * pageSize, current * pageSize);
  const summary = contactSummary(shown);
  const cols = columns.filter((c) => visible.includes(c.key));
  const target = selected.size ? shown.filter((r) => selected.has(r)) : shown;
  const changed = JSON.stringify(view) !== JSON.stringify(emptyView);
  const update = (next: Partial<TableView>) => {
    setView((v) => ({ ...v, ...next }));
    setPage(1);
  };
  const toggleSort = (key: string) =>
    update({
      sort:
        view.sort?.key !== key
          ? { key, dir: "asc" }
          : view.sort.dir === "asc"
            ? { key, dir: "desc" }
            : null,
    });
  const allOnPage =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r));
  const emails = [
    ...new Set(target.map((r) => cellText(r.email).trim()).filter(Boolean)),
  ];

  return (
    <section className="lt" aria-label="Results table">
      <div className="lt-stats">
        <div>
          <strong>{summary.total.toLocaleString()}</strong>
          <span>
            {changed ? `of ${rows.length.toLocaleString()} shown` : "results"}
          </span>
        </div>
        {contactKeys.map((key) => (
          <div key={key}>
            <strong>{summary[key]}</strong>
            <span>with {label(key).toLowerCase()}</span>
          </div>
        ))}
        {summary.averageScore != null && (
          <div>
            <strong>{summary.averageScore}</strong>
            <span>average score</span>
          </div>
        )}
      </div>

      <div className="lt-toolbar">
        <label className="lt-search">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search results</span>
          <input
            type="search"
            placeholder="Search everything…"
            value={view.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        {filters.map((f) => (
          <label className="lt-select" key={f.key}>
            <span className="sr-only">{f.label}</span>
            <select
              value={view.filters[f.key] ?? ""}
              onChange={(e) =>
                update({
                  filters: { ...view.filters, [f.key]: e.target.value },
                })
              }
            >
              <option value="">Any {f.label.toLowerCase()}</option>
              {f.values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden />
          </label>
        ))}
        {hasScore && (
          <label className="lt-select">
            <span className="sr-only">Minimum score</span>
            <select
              value={view.minScore ?? ""}
              onChange={(e) =>
                update({
                  minScore: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Any score</option>
              {[40, 60, 80].map((n) => (
                <option key={n} value={n}>
                  Score {n}+
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden />
          </label>
        )}
        {contactKeys.map((key) => {
          const on = view.has.includes(key);
          return (
            <button
              key={key}
              type="button"
              className="lt-chip"
              aria-pressed={on}
              onClick={() =>
                update({
                  has: on
                    ? view.has.filter((k) => k !== key)
                    : [...view.has, key],
                })
              }
            >
              {on && <Check size={14} aria-hidden />}
              Has {label(key).toLowerCase()}
            </button>
          );
        })}
        {changed && (
          <button
            type="button"
            className="lt-ghost"
            onClick={() => update(emptyView)}
          >
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
        )}
        <div className="lt-actions">
          <details className="lt-menu">
            <summary>
              <Columns3 size={15} aria-hidden /> Columns
            </summary>
            <div role="group" aria-label="Visible columns">
              {columns.map((c) => (
                <label key={c.key}>
                  <input
                    type="checkbox"
                    checked={visible.includes(c.key)}
                    onChange={() =>
                      setVisible((v) =>
                        v.includes(c.key)
                          ? v.filter((k) => k !== c.key)
                          : [...v, c.key],
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </details>
          <details className="lt-menu lt-menu-end">
            <summary className="lt-primary">
              <Download size={15} aria-hidden /> Export
            </summary>
            <div>
              <p>
                {selected.size
                  ? `${target.length} selected rows`
                  : `${target.length} rows shown`}
              </p>
              <button
                type="button"
                onClick={() =>
                  download(
                    filename + ".csv",
                    "text/csv",
                    datasetCsv(pickColumns(target, visible)),
                  )
                }
              >
                CSV, visible columns
              </button>
              <button
                type="button"
                onClick={() =>
                  download(
                    filename + "-all-fields.csv",
                    "text/csv",
                    datasetCsv(target),
                  )
                }
              >
                CSV, all fields
              </button>
              <button
                type="button"
                onClick={() =>
                  download(
                    filename + ".json",
                    "application/json",
                    JSON.stringify(target, null, 2),
                  )
                }
              >
                JSON, all fields
              </button>
              {emails.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(emails.join("\n"));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  <Copy size={14} aria-hidden />
                  {copied ? "Copied" : `Copy ${emails.length} emails`}
                </button>
              )}
            </div>
          </details>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="lt-selection" role="status">
          {selected.size} selected
          <button
            type="button"
            className="lt-ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="lt-scroll">
        <table>
          <thead>
            <tr>
              <th className="lt-check">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={allOnPage}
                  onChange={() =>
                    setSelected((s) => {
                      const next = new Set(s);
                      pageRows.forEach((r) =>
                        allOnPage ? next.delete(r) : next.add(r),
                      );
                      return next;
                    })
                  }
                />
              </th>
              {cols.map((c) => {
                const sorted = view.sort?.key === c.key ? view.sort.dir : null;
                return (
                  <th
                    key={c.key}
                    aria-sort={
                      sorted
                        ? sorted === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={c.kind === "number" ? "lt-num" : undefined}
                  >
                    <button type="button" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {sorted === "asc" ? (
                        <ArrowUp size={13} aria-hidden />
                      ) : sorted === "desc" ? (
                        <ArrowDown size={13} aria-hidden />
                      ) : (
                        <ArrowUpDown
                          size={13}
                          aria-hidden
                          className="lt-idle"
                        />
                      )}
                    </button>
                  </th>
                );
              })}
              <th className="lt-more">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <RowGroup
                key={(current - 1) * pageSize + i}
                row={row}
                cols={cols}
                checked={selected.has(row)}
                open={open === row}
                onCheck={() =>
                  setSelected((s) => {
                    const next = new Set(s);
                    if (next.has(row)) next.delete(row);
                    else next.add(row);
                    return next;
                  })
                }
                onOpen={() => setOpen(open === row ? null : row)}
              />
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div className="lt-none">
            <p>No results match these filters.</p>
            <button
              type="button"
              className="lt-ghost"
              onClick={() => update(emptyView)}
            >
              <RotateCcw size={14} aria-hidden /> Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="lt-footer">
        <label className="lt-select">
          <span className="sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden />
        </label>
        <span>
          {shown.length ? (current - 1) * pageSize + 1 : 0}–
          {Math.min(current * pageSize, shown.length)} of{" "}
          {shown.length.toLocaleString()}
        </span>
        <div>
          <button
            type="button"
            className="lt-ghost"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="lt-ghost"
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function RowGroup({
  row,
  cols,
  checked,
  open,
  onCheck,
  onOpen,
}: {
  row: DataRow;
  cols: Column[];
  checked: boolean;
  open: boolean;
  onCheck: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <tr className={checked ? "lt-on" : undefined}>
        <td className="lt-check">
          <input
            type="checkbox"
            aria-label="Select row"
            checked={checked}
            onChange={onCheck}
          />
        </td>
        {cols.map((c) => (
          <td
            key={c.key}
            className={c.kind === "number" ? "lt-num" : undefined}
          >
            <Cell column={c} value={row[c.key]} />
          </td>
        ))}
        <td className="lt-more">
          <button type="button" aria-expanded={open} onClick={onOpen}>
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="lt-open">
          <td colSpan={cols.length + 2}>
            <Detail row={row} />
          </td>
        </tr>
      )}
    </>
  );
}
