"use client";
import { useState } from "react";
import { ChevronDown, Search, UsersRound } from "lucide-react";
import { humanize, isJobRow, rowName, record } from "@/lib/workspace/results";
import type { DataRow } from "@/lib/workspace/data-view";

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((v, i) => (
          <li key={i}>
            <Value value={v} />
          </li>
        ))}
      </ul>
    );
  if (record(value))
    return (
      <dl>
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <dt>{humanize(k)}</dt>
            <dd>
              <Value value={v} />
            </dd>
          </div>
        ))}
      </dl>
    );
  if (typeof value === "string" && /^https?:\/\//i.test(value))
    return (
      <a className="vl-text-link" rel="noreferrer" target="_blank" href={value}>
        {value}
      </a>
    );
  return <>{value == null || value === "" ? "—" : String(value)}</>;
}
export function ResultExplorer({ rows }: { rows: DataRow[] }) {
  const [search, setSearch] = useState(""),
    [priority, setPriority] = useState(""),
    [sort, setSort] = useState("original");
  const [limit, setLimit] = useState(50);
  const records = rows.filter(
    (r) =>
      (!priority || r.priority === priority) &&
      JSON.stringify(r).toLowerCase().includes(search.trim().toLowerCase()),
  );
  if (sort === "name")
    records.sort((a, b) => rowName(a).localeCompare(rowName(b)));
  if (sort === "score")
    records.sort((a, b) => Number(b.score ?? -1) - Number(a.score ?? -1));
  const leadView = rows.some((r) => !r.workflow);
  const jobView = rows.length > 0 && rows.every(isJobRow);
  const priorities = [
    ...new Set(
      rows
        .map((r) => r.priority)
        .filter((s): s is string => typeof s === "string"),
    ),
  ];
  return (
    <>
      {leadView && !jobView && rows.length > 0 && (
        <section className="rd-card">
          <header>
            <UsersRound size={18} />
            <h2>Contact coverage</h2>
          </header>
          <small>Records with a contact field in this view</small>
          <div className="rd-coverage">
            {["email", "phone", "website"].map((key) => {
              const n = records.filter(
                (r) => typeof r[key] === "string" && String(r[key]).trim(),
              ).length;
              return (
                <div key={key}>
                  <span>{humanize(key)}</span>
                  <strong>
                    {n} / {records.length}
                  </strong>
                  <div className="rd-track">
                    <i
                      style={{
                        width:
                          (records.length ? (n / records.length) * 100 : 0) +
                          "%",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="rd-card">
        <header>
          <h2>
            {jobView
              ? "Jobs"
              : leadView
                ? "Result records"
                : "Workflow results"}
          </h2>
          <small>{records.length} shown on this page</small>
        </header>
        <div className="rd-filterbar">
          <div className="rd-search">
            <Search size={16} />
            <input
              aria-label="Search results"
              placeholder="Search names, places or details"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {priorities.length > 0 && (
            <label>
              <select
                aria-label="Filter priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">All priorities</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {humanize(p)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <select
              aria-label="Sort results"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="original">Original order</option>
              <option value="name">Name A–Z</option>
              {rows.some((r) => typeof r.score === "number") && (
                <option value="score">Highest score</option>
              )}
            </select>
          </label>
        </div>
        {records.slice(0, limit).map((r, i) => (
          <details className="rd-record" key={rowName(r) + i}>
            <summary>
              <span className="rd-avatar">
                {rowName(r).slice(0, 1).toUpperCase()}
              </span>
              <span className="rd-record-label">
                <strong>{rowName(r)}</strong>
                <small>
                  {isJobRow(r)
                    ? [r.company, r.location].filter(Boolean).join(" · ")
                    : String(
                        r.searchedCity ||
                          r.city ||
                          r.category ||
                          r.email ||
                          (r.status && humanize(String(r.status))) ||
                          r.outcome ||
                          "View details",
                      )}
                </small>
              </span>
              {r.score != null && (
                <span className="rd-score">Score {String(r.score)}</span>
              )}
              <ChevronDown size={16} />
            </summary>
            <div className="rd-detail">
              <Value value={r} />
            </div>
          </details>
        ))}
        {records.length > limit && (
          <button
            className="vl-button vl-secondary"
            onClick={() => setLimit(limit + 50)}
          >
            Show more records
          </button>
        )}
        {!records.length && (
          <div className="rd-empty">
            {rows.length
              ? "No records match these filters."
              : "This workflow has no result records on this page."}
          </div>
        )}
      </section>
    </>
  );
}
