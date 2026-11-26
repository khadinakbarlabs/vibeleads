"use client";

/**
 * Live progress overlay for an in-flight search. Rendered above the
 * (initially empty) leads table on `/search/[id]`.
 *
 * Subscribes to Supabase Realtime UPDATEs on `searches.id=eq.<id>` and
 * re-renders whenever the backend writes a new `progress` jsonb. The
 * overlay smoothly tweens count-up numbers (LiveCounter), runs a
 * breathing strip while the actor is mid-crawl (BreathingBar), and
 * shows a step-rail of the pipeline (AgentTrace).
 *
 * On `phase = "completed"` the overlay calls `onComplete()` which the
 * parent uses to swap to the `<LeadsTable>`. Until then the empty-rows
 * area shows shimmering placeholders.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Sparkles,
  MapPin,
  Filter,
  ShieldCheck,
  Database,
  Clock,
  Square,
  SendHorizonal,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/db/browser";
import { cn } from "@/lib/utils/cn";
import { LiveCounter } from "@/components/motion/LiveCounter";
import { BreathingBar } from "@/components/motion/BreathingBar";
import { AgentTrace, type TraceStep } from "@/components/motion/AgentTrace";
import { cancelSearch } from "@/app/(app)/search/[id]/cancel-action";
import type { Tables } from "@/lib/db/types";

type Search = Tables<"searches">;

/** Mirrors lib/searches/progress.ts SearchProgress; redeclared to avoid a server-only import. */
interface SearchProgress {
  phase:
    | "queued"
    | "routing"
    | "scraping"
    | "normalizing"
    | "enriching"
    | "completing"
    | "completed"
    | "failed";
  step: string;
  expected_leads: number;
  scraped: number;
  normalized: number;
  enriched_phones: number;
  enriched_emails: number;
  enriched_socials: number;
  started_at: string;
  updated_at: string;
  eta_secs: number | null;
  log: string[];
}

/**
 * Rotating filler copy shown during long phases. One bank per intent so
 * we don't say "crawling Google Maps" while the LinkedIn jobs scraper
 * is running. Falls back to LOCAL_BUSINESS_COPY for unknown intents.
 */
const COPY_BY_INTENT: Record<string, readonly string[]> = {
  local_business: [
    "Crawling Google Maps for matching places.",
    "Reading listings page by page — this usually takes a minute or two.",
    "Filtering by your radius and category constraints.",
    "Pulling phone numbers and websites where they're public.",
    "Deduping near-identical listings against last week's runs.",
    "Normalizing phone numbers to E.164 so dialers can use them.",
    "Almost there — formatting the final table.",
  ],
  gmaps_leads: [
    "Crawling Google Maps for matching places.",
    "Visiting each business website to extract emails.",
    "Scanning footer + about pages for socials.",
    "Validating emails against MX records before they reach you.",
    "Normalizing phone numbers to E.164.",
    "Almost there — formatting the final table.",
  ],
  web_serp: [
    "Querying Google for the brief you wrote.",
    "Paginating through organic results.",
    "Skipping ads and knowledge-graph repeats.",
    "Pulling each result's title + snippet + URL.",
    "Almost there — formatting the final table.",
  ],
  contact_form: [
    "Crawling each domain for contact pages.",
    "Extracting emails, phones, and social links.",
    "Filtering pages that look like contact forms.",
    "Deduping by domain across discovered URLs.",
  ],
  contact_form_submit: [
    "Searching Google for matching contact-form pages.",
    "Opening each page and locating the form.",
    "Filling standard fields with your sender details.",
    "Auto-filling any custom fields the form asks for.",
    "Submitting and recording the receipt.",
    "Skipping any page protected by hCaptcha or reCaptcha.",
  ],
  hiring_intent: [
    "Querying LinkedIn for matching job postings.",
    "Reading seniority + salary + skills off each post.",
    "Filtering by date-posted window.",
    "Deduping postings re-listed by the same company.",
  ],
  producthunt: [
    "Walking the Product Hunt leaderboard.",
    "Resolving each launch's makers + topic.",
    "Running the Hunter → Snov → page-scrape email waterfall.",
    "Deduping makers who shipped multiple products.",
  ],
} as const;

type PhaseDef = {
  id: SearchProgress["phase"];
  label: string;
  short: string;
};

const PHASES: PhaseDef[] = [
  { id: "routing", label: "Reading your brief", short: "Routing" },
  { id: "scraping", label: "Crawling source data", short: "Scraping" },
  { id: "normalizing", label: "Normalizing rows", short: "Normalize" },
  { id: "enriching", label: "Validating + enriching", short: "Enrich" },
  { id: "completed", label: "Ready", short: "Done" },
];

// Outreach campaigns reuse this component but read as "finding businesses →
// writing + submitting messages", never "scraping / crawling / candidates".
const OUTREACH_PHASES: PhaseDef[] = [
  { id: "routing", label: "Reading your brief", short: "Brief" },
  { id: "scraping", label: "Finding businesses", short: "Find" },
  { id: "normalizing", label: "Submitting messages", short: "Submit" },
  { id: "enriching", label: "Personalizing", short: "Personalize" },
  { id: "completed", label: "Done", short: "Done" },
];

interface SearchProgressProps {
  initial: Search;
  onComplete?: () => void;
}

export function SearchProgress({ initial, onComplete }: SearchProgressProps) {
  const [search, setSearch] = useState<Search>(initial);
  const [tickIdx, setTickIdx] = useState(0);
  const completedFiredRef = useRef(false);

  // Subscribe to Realtime UPDATEs on this search row.
  //
  // The channel name carries a per-mount nonce (captured inside the
  // effect) so React 19 strict-mode double-mount doesn't reuse a
  // channel that's already in the `joined` state. Without the nonce
  // the second mount's `.on()` lands on a subscribed channel and
  // throws "cannot add postgres_changes callbacks after subscribe()".
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const nonce = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`search:${initial.id}:${nonce}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "searches",
          filter: `id=eq.${initial.id}`,
        },
        (payload) => setSearch(payload.new as Search),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initial.id]);

  // Per-intent copy bank. Falls back to local_business if the intent
  // isn't in the map — same baseline messaging.
  const rotatingCopy = useMemo<readonly string[]>(() => {
    const intent = (search.intent as string | null) ?? "local_business";
    return COPY_BY_INTENT[intent] ?? COPY_BY_INTENT.local_business;
  }, [search.intent]);

  // Cycle the rotating copy every 5s during long phases.
  useEffect(() => {
    const t = setInterval(() => {
      setTickIdx((i) => (i + 1) % rotatingCopy.length);
    }, 5000);
    return () => clearInterval(t);
  }, [rotatingCopy.length]);

  // Fire `onComplete` once when the row reaches a terminal status.
  useEffect(() => {
    if (
      !completedFiredRef.current &&
      (search.status === "completed" || search.status === "failed")
    ) {
      completedFiredRef.current = true;
      // Tiny delay so the count-up animation settles before the layout
      // swaps to the leads table.
      const t = setTimeout(() => onComplete?.(), 350);
      return () => clearTimeout(t);
    }
  }, [search.status, onComplete]);

  const progress = (search.progress as SearchProgress | null) ?? null;
  const phase = progress?.phase ?? mapStatusToPhase(search.status);
  const elapsedMs = useElapsed(search.started_at ?? search.created_at);
  const etaSecs = progress?.eta_secs ?? null;

  const isOutreach = (search.intent as string | null) === "contact_form_submit";
  const phases = isOutreach ? OUTREACH_PHASES : PHASES;

  const steps: TraceStep[] = useMemo(() => {
    return phases.map((p) => {
      const idx = phases.findIndex((x) => x.id === p.id);
      const currentIdx = phases.findIndex((x) => x.id === phase);
      const state: TraceStep["state"] =
        idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending";
      return {
        id: p.id,
        label: p.label,
        state,
        detail: stepDetail(p.id, progress, isOutreach),
      };
    });
  }, [phase, progress, phases, isOutreach]);

  const isFailed = search.status === "failed";

  return (
    <section
      className="glass-panel aurora relative overflow-hidden p-5 sm:p-6"
      style={{ "--aurora-intensity": "0.45" } as React.CSSProperties}
      aria-busy={!isFailed && phase !== "completed"}
    >
      {/* Background atmosphere — subtle dot grid that drifts (compositor-friendly translate) */}
      <div
        aria-hidden
        className="motion-safe:animate-[fade-in_400ms_ease-out] pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(var(--color-fg) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Header: status + elapsed + eta */}
      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
            <Sparkles className="h-3 w-3" />
            {isFailed
              ? "search failed"
              : phase === "completed"
                ? "search complete"
                : "search in flight"}
          </p>
          <h2 className="mt-1 truncate text-base font-medium tracking-tight text-[var(--color-fg)]">
            {progress?.step ??
              search.status_reason ??
              "Working on your search…"}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-[11px]">
          <Pill icon={<Clock className="h-3 w-3" />} label="elapsed">
            {formatSecs(elapsedMs / 1000)}
          </Pill>
          {etaSecs != null && etaSecs > 0 && phase !== "completed" && (
            <Pill icon={<Clock className="h-3 w-3 opacity-60" />} label="eta">
              ~{formatSecs(Math.max(etaSecs - elapsedMs / 1000, 0))}
            </Pill>
          )}
          {/* Cancel button — only shown while the run is non-terminal.
              Aborts the Apify run, refunds the unspent credit budget,
              and flips the row to status=canceled. Hidden once the
              run is completed/failed/canceled so a stale tab doesn't
              show a misleading control. */}
          {phase !== "completed" && !isFailed && (
            <CancelButton searchId={search.id} />
          )}
        </div>
      </header>

      {/* Live counter row — outreach shows found/submitted; lead-gen shows
          the discovery + enrichment counters. */}
      {isOutreach ? (
        <div className="relative mt-5 grid grid-cols-2 gap-4">
          <Counter
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="businesses found"
            value={progress?.scraped ?? 0}
            tone="default"
          />
          <Counter
            icon={<SendHorizonal className="h-3.5 w-3.5" />}
            label="messages submitted"
            value={progress?.normalized ?? 0}
            tone="emphasis"
            target={progress?.expected_leads}
          />
        </div>
      ) : (
        <div className="relative mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Counter
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="candidates"
            value={progress?.scraped ?? 0}
            tone="default"
          />
          <Counter
            icon={<Filter className="h-3.5 w-3.5" />}
            label="matched"
            value={progress?.normalized ?? 0}
            tone="emphasis"
            target={progress?.expected_leads}
          />
          <Counter
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="emails validated"
            value={progress?.enriched_emails ?? 0}
            tone="default"
          />
          <Counter
            icon={<Database className="h-3.5 w-3.5" />}
            label="socials found"
            value={progress?.enriched_socials ?? 0}
            tone="default"
          />
        </div>
      )}

      {/* Indeterminate breathing strip during scraping; deterministic ratio elsewhere */}
      <div className="relative mt-5">
        <BreathingBar
          value={
            phase === "completed"
              ? 1
              : phase === "scraping"
                ? undefined
                : ratioFromProgress(progress)
          }
        />
      </div>

      {/* Step rail */}
      <div className="relative mt-6">
        <AgentTrace steps={steps} />
      </div>

      {/* Live arrivals — leads streaming in from realtime as they're
          inserted. Subscribes to public.leads with search_id filter. */}
      {!isFailed && phase !== "completed" && (
        <LiveArrivals searchId={search.id} intent={search.intent as string} />
      )}

      {/* Rotating in-flight copy */}
      {!isFailed && phase !== "completed" && (
        <p
          key={tickIdx}
          className="motion-safe:animate-fade-in relative mt-4 text-[12px] italic text-[var(--color-fg-muted)]"
        >
          {rotatingCopy[tickIdx % rotatingCopy.length]}
        </p>
      )}

      {isFailed && search.status_reason && (
        <p className="relative mt-4 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
          {search.status_reason}
        </p>
      )}
    </section>
  );
}

/**
 * Realtime stream of arriving leads. Subscribes to INSERTs on the
 * `leads` table filtered by search_id, and shows the most recent N as
 * a stack of slim cards that animate in from the top. Each card surfaces
 * the most identifying field for the actor's row shape (business name
 * for gmaps; product name for PH; URL for SERP). When a lead lands the
 * card slides down and the older entries shift; the rolling window
 * caps at 5 so the rail doesn't grow unbounded during 200-row runs.
 *
 * This is the "feel alive" piece of the progress card — counters tick
 * up but the user couldn't see WHICH lead landed; here they can. The
 * subscription runs in addition to the search-row subscription above
 * (separate channel, separate filter) so the two streams don't fight
 * each other.
 */
interface ArrivalRow {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  city: string | null;
  website: string | null;
  source_url: string | null;
  created_at: string;
  /** AI-generated one-line fit summary, filled in by the annotator after
   * the row lands. Starts null and is later patched in via a leads
   * UPDATE event so the user sees "Lead appears → summary fades in"
   * one after the other. */
  ai_fit_summary: string | null;
}

function LiveArrivals({
  searchId,
  intent,
}: {
  searchId: string;
  intent: string;
}) {
  const [arrivals, setArrivals] = useState<ArrivalRow[]>([]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    // Per-mount nonce — see SearchProgress's first useEffect for rationale.
    const nonce = crypto.randomUUID().slice(0, 8);
    const channel = supabase
      .channel(`leads-arrivals:${searchId}:${nonce}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `search_id=eq.${searchId}`,
        },
        (payload) => {
          const row = payload.new as Partial<ArrivalRow> & {
            enrichment_meta?: { ai_fit_summary?: string } | null;
          };
          setArrivals((prev) =>
            [
              {
                id: String(row.id ?? cryptoRandomId()),
                business_name: row.business_name ?? null,
                contact_name: row.contact_name ?? null,
                city: row.city ?? null,
                website: row.website ?? null,
                source_url: row.source_url ?? null,
                created_at: row.created_at ?? new Date().toISOString(),
                ai_fit_summary: row.enrichment_meta?.ai_fit_summary ?? null,
              },
              ...prev,
            ].slice(0, 5),
          );
        },
      )
      // Watch for UPDATEs too — the AI annotator writes the fit
      // summary to enrichment_meta AFTER the initial INSERT, so the
      // arrivals card needs to splice the new summary into the
      // existing card it already rendered.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `search_id=eq.${searchId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            enrichment_meta?: { ai_fit_summary?: string } | null;
          };
          if (!row.id) return;
          const summary = row.enrichment_meta?.ai_fit_summary ?? null;
          setArrivals((prev) =>
            prev.map((a) =>
              a.id === row.id ? { ...a, ai_fit_summary: summary } : a,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchId]);

  if (arrivals.length === 0) return null;

  return (
    <div className="relative mt-5">
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
        <span
          aria-hidden
          className="motion-safe:animate-[calm-pulse_1600ms_ease-in-out_infinite] inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]"
        />
        latest arrivals
        <span className="ml-1 text-[var(--color-fg-muted)] normal-case tracking-normal">
          (live)
        </span>
      </p>
      <ul className="space-y-1.5" aria-live="polite">
        {arrivals.map((a, idx) => (
          <ArrivalCard key={a.id} arrival={a} intent={intent} index={idx} />
        ))}
      </ul>
    </div>
  );
}

function ArrivalCard({
  arrival,
  intent,
  index,
}: {
  arrival: ArrivalRow;
  intent: string;
  index: number;
}) {
  const primary = primaryLabel(arrival, intent);
  const secondary = secondaryLabel(arrival, intent);
  const isNewest = index === 0;
  return (
    <li
      className={cn(
        "motion-safe:animate-[fade-in_320ms_ease-out] flex items-center gap-3 rounded-md border bg-[var(--color-bg)] px-3 py-2 text-sm transition-opacity",
        isNewest
          ? "border-[var(--color-accent)]/40 shadow-[0_0_0_3px_var(--color-accent-soft)]"
          : "border-[var(--color-border)] opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isNewest
            ? "bg-[var(--color-accent)]"
            : "bg-[var(--color-fg-subtle)]/40",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium tracking-tight">{primary}</p>
        {secondary && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-fg-muted)]">
            {secondary}
          </p>
        )}
        {/* AI fit summary — appears after the row, animated via
            fade-in so the user sees "lead lands → AI summary fades
            in" as a sequence. Falls back silently when annotation
            isn't available yet. */}
        {arrival.ai_fit_summary && (
          <p className="motion-safe:animate-[fade-in_280ms_ease-out] mt-1 line-clamp-2 text-[11px] italic leading-snug text-[var(--color-fg-muted)]">
            <span
              aria-hidden
              className="mr-1 inline-block h-1 w-1 -translate-y-[2px] rounded-full bg-[var(--color-accent)]"
            />
            {arrival.ai_fit_summary}
          </p>
        )}
      </div>
      <span className="font-mono text-[10px] text-[var(--color-fg-subtle)]">
        {isNewest ? "just now" : "+earlier"}
      </span>
    </li>
  );
}

function primaryLabel(a: ArrivalRow, intent: string): string {
  if (intent === "web_serp" || intent === "contact_form") {
    return a.website ?? a.source_url ?? a.business_name ?? "(new result)";
  }
  if (intent === "hiring_intent" || intent === "producthunt") {
    return a.business_name ?? a.contact_name ?? "(new result)";
  }
  return a.business_name ?? a.contact_name ?? "(new result)";
}

function secondaryLabel(a: ArrivalRow, intent: string): string | null {
  if (intent === "web_serp" || intent === "contact_form") {
    return a.business_name ?? null;
  }
  if (intent === "hiring_intent") return a.city ?? null;
  return a.city ?? a.website ?? null;
}

function cryptoRandomId(): string {
  // Defensive fallback when an INSERT payload lacks an id (shouldn't
  // happen for our schema, but a missing key would otherwise crash the
  // React keyed list).
  return Math.random().toString(36).slice(2);
}

function Pill({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-0.5 font-mono">
      {icon}
      <span className="text-[var(--color-fg-subtle)]">{label}</span>
      <span className="font-medium tabular-nums text-[var(--color-fg)]">
        {children}
      </span>
    </span>
  );
}

function Counter({
  icon,
  label,
  value,
  target,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  target?: number;
  tone: "default" | "emphasis";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5",
        tone === "emphasis" &&
          "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]/40",
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          tone === "emphasis"
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-fg)]",
        )}
      >
        <LiveCounter value={value} />
        {target != null && (
          <span className="ml-1 font-mono text-xs font-normal text-[var(--color-fg-subtle)]">
            / {target}
          </span>
        )}
      </p>
    </div>
  );
}

function mapStatusToPhase(status: Search["status"]): SearchProgress["phase"] {
  switch (status) {
    case "queued":
      return "queued";
    case "routing":
      return "routing";
    case "running":
      return "scraping";
    case "normalizing":
      return "normalizing";
    case "enriching":
      return "enriching";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "queued";
  }
}

function stepDetail(
  id: SearchProgress["phase"],
  p: SearchProgress | null,
  isOutreach = false,
): string | null {
  if (!p) return null;
  switch (id) {
    case "routing":
      return p.phase === "routing" ? p.step : null;
    case "scraping":
      return p.scraped > 0
        ? `${p.scraped} ${isOutreach ? "found" : "candidates"} so far`
        : null;
    case "normalizing":
      return p.normalized > 0
        ? isOutreach
          ? `${p.normalized} submitted`
          : `${p.normalized} matched after filters`
        : null;
    case "enriching":
      return p.enriched_emails > 0 || p.enriched_socials > 0
        ? `${p.enriched_emails} emails validated · ${p.enriched_socials} socials found`
        : null;
    default:
      return null;
  }
}

function ratioFromProgress(p: SearchProgress | null): number | undefined {
  if (!p) return undefined;
  // Coarse proxy: how far through the pipeline are we, weighted by phase.
  const idx = PHASES.findIndex((x) => x.id === p.phase);
  if (idx < 0) return undefined;
  return Math.min(1, (idx + 0.5) / PHASES.length);
}

function useElapsed(startedAt: string | null | undefined): number {
  // Updates 1×/sec on a setInterval. The state holds elapsed milliseconds
  // (not Date.now()) so render is pure — Date.now() lives only inside
  // the effect tick, satisfying React 19's purity rules.
  //
  // The initial setElapsed(compute()) runs via requestAnimationFrame
  // rather than synchronously inside the effect — React 19 flags
  // synchronous setState in effects as a cascading-render risk and the
  // first paint can use the 0 default before the rAF tick lands. The
  // visible flash is one frame, well below perception.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const compute = () => Math.max(0, Date.now() - start);
    const raf = requestAnimationFrame(() => setElapsed(compute()));
    const t = window.setInterval(() => setElapsed(compute()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, [startedAt]);
  return elapsed;
}

function formatSecs(secs: number): string {
  const s = Math.round(secs);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

/**
 * Inline cancel control for an in-flight search.
 *
 * Two-step flow so a misclick doesn't kill a 200-credit run by
 * accident: first click arms the button (turns danger-red, copy
 * flips to "Confirm cancel"), second click within 4s actually
 * dispatches the server action. The armed state auto-resets if the
 * user pauses or moves away.
 *
 * Server action does Apify abort + credit refund + status flip. The
 * realtime broadcast on the search row drives the UI swap to
 * terminal-state without us having to mutate local state here.
 */
function CancelButton({ searchId }: { searchId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  function handle() {
    if (!armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      await cancelSearch(searchId);
      // The realtime UPDATE will flip search.status and the parent
      // shell will swap views. No local state to manage here.
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label={armed ? "Confirm cancel" : "Cancel run"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors",
        armed
          ? "border-[var(--color-danger)] bg-[var(--color-danger)]/12 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]",
        pending && "cursor-wait opacity-60",
      )}
    >
      <Square className="h-3 w-3" fill="currentColor" />
      {pending ? "Cancelling…" : armed ? "Confirm cancel" : "Cancel run"}
    </button>
  );
}
