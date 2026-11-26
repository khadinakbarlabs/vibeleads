"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCheck,
  Clock3,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import type { ActivityRun } from "@/lib/workspace/apify";
import { duration, outcome } from "@/lib/workspace/results";
import { runDate } from "@/lib/workspace/data-view";

const states = ["Completed", "In progress", "Needs attention"];
const tones = ["#6552d9", "#54adbb", "#e69b64"];
export function ActivityDashboard({
  runs,
  overview,
  range,
  group,
  batch,
  partial,
}: {
  runs: ActivityRun[];
  overview: { startedAt: string; status: string }[];
  range: string;
  group: string;
  batch: number;
  partial: boolean;
}) {
  const [term, search] = useState(""),
    [workflow, setWorkflow] = useState("");
  const visible = runs.filter(
    (r) =>
      (!workflow || r.workflow === workflow) &&
      (r.workflow + " " + r.id)
        .toLowerCase()
        .includes(term.toLowerCase().trim()),
  );
  const counts = states.map(
    (s) => overview.filter((r) => outcome(r.status) === s).length,
  );
  const dayCounts = new Map<string, number>();
  for (const run of overview) {
    const day = run.startedAt.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }
  const series = Array.from(dayCounts).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...series.map(([, n]) => n));
  const hasFilter = !!(term || workflow);
  function clear() {
    search("");

    setWorkflow("");
  }
  return (
    <>
      <form method="get" className="rd-filterbar">
        <input type="hidden" name="batch" value={batch} />
        <label>
          <select aria-label="Filter by date" name="range" defaultValue={range}>
            <option value="all">All dates</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label>
          <select
            name="group"
            aria-label="Filter by status"
            defaultValue={group}
          >
            <option value="">All outcomes</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="vl-button vl-secondary">
          Apply
        </button>
        <small>
          {partial
            ? "History group " + batch + " · up to 1,000 runs"
            : "All workflow history"}
        </small>
      </form>
      <div className="rd-metrics">
        {[Activity, CheckCheck, Clock3, TriangleAlert].map((Icon, i) => (
          <div key={i}>
            <span className={"rd-icon t" + i}>
              <Icon size={18} />
            </span>
            <span>{["Workflow runs", ...states][i]}</span>
            <strong>{[overview.length, ...counts][i]}</strong>
          </div>
        ))}
      </div>
      <div className="rd-charts">
        <section className="rd-card">
          <header>
            <Activity size={18} />
            <h2>Run activity</h2>
          </header>
          <small>Runs by active day · UTC</small>
          {series.length ? (
            <div className="rd-bars" aria-label="Run activity by date">
              {series.map(([day, n]) => (
                <div key={day} title={day + " · " + n + " runs"}>
                  <strong>{n}</strong>
                  <i style={{ height: (n / max) * 76 + "px" }} />
                  <span>{day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rd-empty">
              Activity appears here when runs match this view.
            </p>
          )}
        </section>
        <section className="rd-card">
          <header>
            <CheckCheck size={18} />
            <h2>Run outcomes</h2>
          </header>
          <small>Share of runs in the selected period</small>
          <div className="rd-outcomes">
            {states.map((s, i) => (
              <div key={s}>
                <span>{s}</span>
                <b>{counts[i]}</b>
                <div className="rd-track">
                  <i
                    style={{
                      background: tones[i],
                      width:
                        (overview.length
                          ? (100 * counts[i]) / overview.length
                          : 0) + "%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="rd-card rd-history" id="runs-heading">
        <header>
          <h2>Workflow history</h2>
          <small>
            {visible.length} of {runs.length} on this page
          </small>
        </header>
        <div className="rd-filterbar">
          <div className="rd-search">
            <Search size={16} />
            <input
              aria-label="Search workflows or run IDs"
              placeholder="Search workflows or run IDs"
              value={term}
              onChange={(e) => search(e.target.value)}
            />
          </div>
          <label>
            <SlidersHorizontal size={15} />
            <select
              aria-label="Filter by workflow"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
            >
              <option value="">All workflows</option>
              {[...new Set(runs.map((r) => r.workflow))].sort().map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          {hasFilter && (
            <button onClick={clear} className="vl-text-link">
              Clear filters
            </button>
          )}
        </div>
        {visible.length ? (
          <div className="vl-table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Workflow",
                    "Outcome",
                    "Started (UTC)",
                    "Duration",
                    "Dataset rows",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        className="rd-runlink"
                        href={"/workspace/runs/" + r.id}
                      >
                        <span>{r.workflow}</span>
                        <ArrowUpRight size={15} />
                      </Link>
                      <small>#{r.id.slice(-7)}</small>
                    </td>
                    <td>
                      <span
                        className="rd-status"
                        data-tone={states.indexOf(outcome(r.status))}
                      >
                        {outcome(r.status)}
                      </span>
                    </td>
                    <td>{runDate(r.startedAt)}</td>
                    <td>{duration(r.startedAt, r.finishedAt)}</td>
                    <td>{r.datasetRows ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rd-empty">
            <h3>
              {hasFilter
                ? "No matching workflows"
                : "No workflows on this page yet"}
            </h3>
            {hasFilter ? (
              <button onClick={clear} className="vl-text-link">
                Clear filters
              </button>
            ) : (
              <Link href="/connect" className="vl-text-link">
                Connect an AI agent
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
