"use client";

/**
 * Public showcase of the contact-form-submit pipeline. Drives a fake
 * outreach run end-to-end so anonymous visitors can see what shipping
 * an outreach campaign through VibeLeads looks like — without needing
 * a SERPAPI_KEY or burning real credits.
 *
 * Three views, switched by phase:
 *   1. compose  — user fills the OutreachComposer
 *   2. running  — fake SearchProgress with submission-style step labels
 *   3. complete — mini results table with submission status chips
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Send,
  ShieldX,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveCounter } from "@/components/motion/LiveCounter";
import { BreathingBar } from "@/components/motion/BreathingBar";
import { AgentTrace, type TraceStep } from "@/components/motion/AgentTrace";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * Sender identity collected in the demo's compose phase. Mirrors the shape
 * the real outreach wizard captures, but the scripted demo run ignores the
 * typed values — it always replays SAMPLE_RECEIPTS.
 */
interface OutreachConfig {
  senderName: string;
  senderEmail: string;
  outreachSubject: string;
  outreachMessage: string;
  senderPhone: string;
  senderCompany: string;
  senderWebsite: string;
  takeScreenshots: boolean;
}

type Phase = "compose" | "running" | "complete";

type SubmissionStatus =
  | "success"
  | "failed"
  | "captcha_blocked"
  | "no_form"
  | "error";

interface Receipt {
  id: string;
  name: string;
  url: string;
  status: SubmissionStatus;
  fields: string[];
  aiFields: string[];
}

const SAMPLE_RECEIPTS: Receipt[] = [
  {
    id: "1",
    name: "Sun & Moon Yoga",
    url: "sunandmoonyoga.com",
    status: "success",
    fields: ["name", "email", "company", "message"],
    aiFields: ["how did you hear"],
  },
  {
    id: "2",
    name: "Ascend Yoga & Pilates",
    url: "ascendyoga.nyc",
    status: "success",
    fields: ["name", "email", "message"],
    aiFields: [],
  },
  {
    id: "3",
    name: "Bushwick Bend Yoga",
    url: "bushwickbend.com",
    status: "success",
    fields: ["name", "email", "company", "message"],
    aiFields: ["referral source"],
  },
  {
    id: "4",
    name: "Park Slope Hot Yoga",
    url: "parkslopehot.com",
    status: "captcha_blocked",
    fields: [],
    aiFields: [],
  },
  {
    id: "5",
    name: "Williamsburg Mat Co.",
    url: "wmatco.com",
    status: "success",
    fields: ["name", "email", "phone", "message"],
    aiFields: ["best time"],
  },
  {
    id: "6",
    name: "Greenpoint Flow",
    url: "greenpointflow.com",
    status: "success",
    fields: ["name", "email", "message"],
    aiFields: [],
  },
  {
    id: "7",
    name: "Crown Heights Yoga",
    url: "chyoga.co",
    status: "success",
    fields: ["name", "email", "company", "message"],
    aiFields: [],
  },
  {
    id: "8",
    name: "Red Hook Movement",
    url: "rhmove.com",
    status: "no_form",
    fields: [],
    aiFields: [],
  },
  {
    id: "9",
    name: "Dumbo Vinyasa Loft",
    url: "dumbovinyasa.com",
    status: "success",
    fields: ["name", "email", "message"],
    aiFields: [],
  },
  {
    id: "10",
    name: "Bay Ridge Stretch",
    url: "bayridgestretch.com",
    status: "failed",
    fields: ["name", "email"],
    aiFields: [],
  },
  {
    id: "11",
    name: "Fort Greene Yoga Co.",
    url: "fgyoga.co",
    status: "success",
    fields: ["name", "email", "message"],
    aiFields: [],
  },
  {
    id: "12",
    name: "Sunset Park Mat House",
    url: "spmath.com",
    status: "success",
    fields: ["name", "email", "company", "message"],
    aiFields: ["how did you hear"],
  },
];

const PHASES: Array<{ id: string; label: string }> = [
  { id: "routing", label: "Reading your brief" },
  { id: "discovering", label: "Discovering contact-form pages" },
  { id: "filling", label: "Filling fields with Claude" },
  { id: "submitting", label: "Submitting + capturing receipts" },
  { id: "complete", label: "Ready" },
];

const TIMELINE: Array<{
  at: number;
  phase: string;
  submitted: number;
  discovered: number;
  step: string;
}> = [
  {
    at: 0,
    phase: "routing",
    submitted: 0,
    discovered: 0,
    step: "Reading your outreach brief…",
  },
  {
    at: 1.5,
    phase: "discovering",
    submitted: 0,
    discovered: 0,
    step: "Searching for contact-form pages via SerpAPI…",
  },
  {
    at: 3,
    phase: "discovering",
    submitted: 0,
    discovered: 5,
    step: "Found 5 candidate contact pages…",
  },
  {
    at: 5,
    phase: "discovering",
    submitted: 0,
    discovered: 12,
    step: "Found 12 candidate contact pages.",
  },
  {
    at: 6,
    phase: "filling",
    submitted: 0,
    discovered: 12,
    step: "Opening Sun & Moon Yoga's form…",
  },
  {
    at: 8,
    phase: "submitting",
    submitted: 1,
    discovered: 12,
    step: "Submitted Sun & Moon Yoga.",
  },
  {
    at: 10,
    phase: "submitting",
    submitted: 3,
    discovered: 12,
    step: "Submitted 3 of 12.",
  },
  {
    at: 12,
    phase: "submitting",
    submitted: 5,
    discovered: 12,
    step: "Submitted 5 of 12. Park Slope Hot Yoga is captcha-walled — skipping.",
  },
  {
    at: 15,
    phase: "submitting",
    submitted: 8,
    discovered: 12,
    step: "Submitted 8 of 12.",
  },
  {
    at: 18,
    phase: "submitting",
    submitted: 10,
    discovered: 12,
    step: "Submitted 10 of 12.",
  },
  {
    at: 21,
    phase: "complete",
    submitted: 10,
    discovered: 12,
    step: "Done — 10 successful submissions, 2 skipped.",
  },
];

const ROTATING = [
  "Probing each landing page for a working contact form.",
  "Mapping form fields to your sender identity (name / email / company).",
  "Auto-filling anything the form asks for that we don't recognize.",
  "Throttling submissions so we don't trip rate limits.",
  "Capturing screenshots if you opted in for proof.",
];

const STATUS_TONE: Record<
  SubmissionStatus,
  {
    bg: string;
    fg: string;
    border: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  success: {
    bg: "bg-[var(--color-success)]/10",
    fg: "text-[var(--color-success)]",
    border: "border-[var(--color-success)]/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "submitted",
  },
  captcha_blocked: {
    bg: "bg-[var(--color-warning)]/10",
    fg: "text-[var(--color-warning)]",
    border: "border-[var(--color-warning)]/30",
    icon: <ShieldX className="h-3 w-3" />,
    label: "captcha",
  },
  no_form: {
    bg: "bg-[var(--color-bg-alt)]",
    fg: "text-[var(--color-fg-muted)]",
    border: "border-[var(--color-border)]",
    icon: <ShieldX className="h-3 w-3" />,
    label: "no form",
  },
  failed: {
    bg: "bg-[var(--color-danger)]/10",
    fg: "text-[var(--color-danger)]",
    border: "border-[var(--color-danger)]/30",
    icon: <XCircle className="h-3 w-3" />,
    label: "failed",
  },
  error: {
    bg: "bg-[var(--color-danger)]/10",
    fg: "text-[var(--color-danger)]",
    border: "border-[var(--color-danger)]/30",
    icon: <XCircle className="h-3 w-3" />,
    label: "error",
  },
};

export default function OutreachDemoPage() {
  const [phase, setPhase] = useState<Phase>("compose");
  const [outreach, setOutreach] = useState<OutreachConfig | null>(null);
  const [tickIdx, setTickIdx] = useState(0);
  const [progress, setProgress] = useState({
    phase: "routing",
    step: "Preparing outreach run…",
    submitted: 0,
    discovered: 0,
  });

  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Drive the fake pipeline once running.
  useEffect(() => {
    if (phase !== "running") return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setElapsedSecs(Math.round(elapsed));
      const matched = TIMELINE.filter((s) => s.at <= elapsed);
      const last = matched[matched.length - 1];
      if (last) setProgress(last);
      if (last?.phase === "complete") {
        clearInterval(interval);
        setTimeout(() => setPhase("complete"), 400);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [phase]);

  // Rotating in-flight copy
  useEffect(() => {
    const t = setInterval(() => setTickIdx((i) => i + 1), 4000);
    return () => clearInterval(t);
  }, []);

  function handleStart() {
    if (
      !outreach ||
      !outreach.senderName.trim() ||
      !outreach.senderEmail.trim()
    ) {
      // Pre-fill with sample if user hasn't typed anything
      setOutreach({
        senderName: "Khadin Akbar",
        senderEmail: "khadin@vibeleads.app",
        outreachSubject: "Quick partnership idea",
        outreachMessage:
          "Hey — I help studios fill empty class slots without paid ads. We doubled bookings for 12 yoga studios in Q1. Open to a 15-min chat?",
        senderPhone: "",
        senderCompany: "VibeLeads",
        senderWebsite: "https://vibeleads.app",
        takeScreenshots: false,
      });
    }
    setElapsedSecs(0);
    setPhase("running");
  }

  const steps: TraceStep[] = PHASES.map((p, idx) => {
    const currentIdx = PHASES.findIndex((x) => x.id === progress.phase);
    const state: TraceStep["state"] =
      idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending";
    return {
      id: p.id,
      label: p.label,
      state,
      detail:
        idx === currentIdx
          ? p.id === "discovering" && progress.discovered > 0
            ? `${progress.discovered} contact pages found`
            : p.id === "submitting"
              ? `${progress.submitted} of ${progress.discovered} submitted`
              : null
          : null,
    };
  });

  const stats = SAMPLE_RECEIPTS.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<SubmissionStatus, number>,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/demo"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Demo home
      </Link>

      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
          demo · contact-form auto-submit
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          Send your outreach through every contact form
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Compose your message once. We discover each lead&apos;s contact form,
          fill known fields, ask Claude for unknowns, and submit — capturing
          receipts (and optional screenshots) for every domain.
        </p>
      </header>

      {phase === "compose" && (
        <>
          <DemoComposer
            onChange={setOutreach}
            defaults={{
              senderName: "Khadin Akbar",
              senderEmail: "khadin@vibeleads.app",
              outreachSubject: "Quick partnership idea",
              outreachMessage:
                "Hey — I help studios fill empty class slots without paid ads. We doubled bookings for 12 yoga studios in Q1. Open to a 15-min chat?",
              senderCompany: "VibeLeads",
              senderWebsite: "https://vibeleads.app",
              takeScreenshots: false,
            }}
          />
          <div className="flex items-center justify-end pt-1">
            <Button onClick={handleStart} size="lg">
              <Sparkles className="h-4 w-4" />
              Run mock outreach (12 yoga studios)
            </Button>
          </div>
        </>
      )}

      {phase === "running" && (
        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(var(--color-fg) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <header className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
                <Send className="h-3 w-3" />
                outreach in flight
              </p>
              <h2 className="mt-1 truncate text-base font-medium tracking-tight">
                {progress.step}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-0.5 font-mono text-[11px]">
              <span className="text-[var(--color-fg-subtle)]">elapsed</span>
              <span className="font-medium tabular-nums text-[var(--color-fg)]">
                {elapsedSecs}s
              </span>
            </span>
          </header>

          <div className="relative mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Counter label="discovered" value={progress.discovered} />
            <Counter label="submitted" value={progress.submitted} emphasis />
            <Counter
              label="skipped"
              value={Math.max(
                0,
                progress.discovered -
                  progress.submitted -
                  (progress.phase === "complete" ? 0 : 0),
              )}
            />
          </div>

          <div className="relative mt-5">
            <BreathingBar
              value={progress.phase === "complete" ? 1 : undefined}
            />
          </div>

          <div className="relative mt-6">
            <AgentTrace steps={steps} />
          </div>

          {progress.phase !== "complete" && (
            <p
              key={tickIdx}
              className="motion-safe:animate-fade-in relative mt-4 text-[12px] italic text-[var(--color-fg-muted)]"
            >
              {ROTATING[tickIdx % ROTATING.length]}
            </p>
          )}
        </section>
      )}

      {phase === "complete" && (
        <>
          <section className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/8 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
                  outreach complete
                </p>
                <h2 className="mt-0.5 text-base font-semibold tracking-tight">
                  Pushed {stats.success} successful submissions across{" "}
                  {SAMPLE_RECEIPTS.length} domains
                </h2>
                <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
                  {stats.captcha_blocked ?? 0} captcha-walled,{" "}
                  {stats.no_form ?? 0} had no contact form,{" "}
                  {(stats.failed ?? 0) + (stats.error ?? 0)} server errors.
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <ResultStat
                label="submitted"
                value={stats.success ?? 0}
                tone="good"
              />
              <ResultStat
                label="captcha"
                value={stats.captcha_blocked ?? 0}
                tone="warn"
              />
              <ResultStat
                label="no form"
                value={stats.no_form ?? 0}
                tone="muted"
              />
              <ResultStat
                label="errors"
                value={(stats.failed ?? 0) + (stats.error ?? 0)}
                tone="bad"
              />
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h3 className="text-sm font-semibold tracking-tight">
                Submission receipts
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
                {SAMPLE_RECEIPTS.length} rows
              </span>
            </header>
            <ul className="divide-y divide-[var(--color-border)]">
              {SAMPLE_RECEIPTS.map((r) => {
                const tone = STATUS_TONE[r.status];
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                        tone.border,
                        tone.bg,
                        tone.fg,
                      )}
                    >
                      {tone.icon}
                      {tone.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium tracking-tight">
                        {r.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-[var(--color-fg-subtle)]">
                        {r.url}
                      </p>
                    </div>
                    {r.fields.length > 0 && (
                      <span className="hidden font-mono text-[10px] text-[var(--color-fg-subtle)] sm:inline">
                        {r.fields.length} fields
                        {r.aiFields.length > 0 && (
                          <span className="ml-1 text-[var(--color-accent)]">
                            +{r.aiFields.length} AI
                          </span>
                        )}
                      </span>
                    )}
                    <Camera className="h-3.5 w-3.5 text-[var(--color-fg-subtle)] opacity-50" />
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-fg-muted)]">
              Replies go to the configured sender. Protected pages appear as
              skipped in the results.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPhase("compose");
                setProgress({
                  phase: "routing",
                  step: "Preparing outreach run…",
                  submitted: 0,
                  discovered: 0,
                });
              }}
            >
              Replay
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Lightweight, self-contained compose form for the demo. Collects the
 * sender identity and emits an OutreachConfig on every change. Replaces
 * the former shared OutreachComposer (removed with the lead-gen surface).
 */
function DemoComposer({
  onChange,
  defaults,
}: {
  onChange: (config: OutreachConfig) => void;
  defaults?: Partial<OutreachConfig>;
}) {
  const [config, setConfig] = useState<OutreachConfig>({
    senderName: defaults?.senderName ?? "",
    senderEmail: defaults?.senderEmail ?? "",
    outreachSubject: defaults?.outreachSubject ?? "",
    outreachMessage: defaults?.outreachMessage ?? "",
    senderPhone: defaults?.senderPhone ?? "",
    senderCompany: defaults?.senderCompany ?? "",
    senderWebsite: defaults?.senderWebsite ?? "",
    takeScreenshots: defaults?.takeScreenshots ?? false,
  });

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  function update<K extends keyof OutreachConfig>(
    key: K,
    value: OutreachConfig[K],
  ) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
        compose · sender identity
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input
            value={config.senderName}
            onChange={(e) => update("senderName", e.target.value)}
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Reply-to email">
          <Input
            type="email"
            value={config.senderEmail}
            onChange={(e) => update("senderEmail", e.target.value)}
            placeholder="jane@studio.example"
          />
        </Field>
        <Field label="Company">
          <Input
            value={config.senderCompany}
            onChange={(e) => update("senderCompany", e.target.value)}
            placeholder="VibeLeads"
          />
        </Field>
        <Field label="Website">
          <Input
            value={config.senderWebsite}
            onChange={(e) => update("senderWebsite", e.target.value)}
            placeholder="https://vibeleads.app"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Subject">
          <Input
            value={config.outreachSubject}
            onChange={(e) => update("outreachSubject", e.target.value)}
            placeholder="Quick partnership idea"
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Message">
          <textarea
            value={config.outreachMessage}
            onChange={(e) => update("outreachMessage", e.target.value)}
            rows={4}
            placeholder="Hey — I help studios fill empty class slots…"
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          checked={config.takeScreenshots}
          onChange={(e) => update("takeScreenshots", e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border-strong)]"
        />
        Capture screenshots of each submission
      </label>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Counter({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5",
        emphasis &&
          "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]/40",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          emphasis ? "text-[var(--color-accent)]" : "text-[var(--color-fg)]",
        )}
      >
        <LiveCounter value={value} />
      </p>
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad" | "muted";
}) {
  const fg =
    tone === "good"
      ? "text-[var(--color-success)]"
      : tone === "warn"
        ? "text-[var(--color-warning)]"
        : tone === "bad"
          ? "text-[var(--color-danger)]"
          : "text-[var(--color-fg-muted)]";
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className={cn("font-mono text-lg font-semibold tabular-nums", fg)}>
        <LiveCounter value={value} />
      </dd>
    </div>
  );
}
