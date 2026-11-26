"use client";

/**
 * Campaign detail — the outreach-native "what happened" view.
 *
 * Replaces the generic lead-gen LeadsTable for contact_form_submit
 * campaigns. Shows a status summary (delivered / blocked / no-form /
 * failed) plus a per-business receipt: status, fields filled, AI-filled
 * fields, error reason, submitted-at, and a link to the proof screenshot.
 *
 * Reads everything from each lead's `raw` submission receipt — no schema
 * change. Only shown after the run reaches a terminal state (the live
 * overlay handles the in-flight phase), so it renders statically.
 */

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ShieldX,
  FileX2,
  XCircle,
  ExternalLink,
  Camera,
  Sparkles,
  Mail,
  MessageSquare,
  CircleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tables } from "@/lib/db/types";
import { isOutreachProofReference } from "@/lib/outreach/proof-storage";

type SubmissionStatus =
  | "success"
  | "chatbot_sent"
  | "unverified"
  | "failed"
  | "captcha_blocked"
  | "low_relevance"
  | "no_channel"
  | "mailto_extracted"
  | "chatbot_detected"
  | "chatbot_prefilled"
  | "suppressed"
  | "daily_cap_hit"
  | "error";

interface Receipt {
  id: string;
  business: string;
  domain: string | null;
  url: string | null;
  status: SubmissionStatus;
  fieldsFilled: string[];
  aiFields: string[];
  error: string | null;
  submittedAt: string | null;
  hasPrivateProof: boolean;
}

interface OutreachResultsProps {
  initialLeads: Tables<"leads">[];
}

const STATUS_META: Record<
  SubmissionStatus,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    cls: string;
  }
> = {
  success: {
    label: "Delivered",
    Icon: CheckCircle2,
    cls: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/30",
  },
  chatbot_sent: {
    label: "Delivered",
    Icon: CheckCircle2,
    cls: "text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/30",
  },
  unverified: {
    label: "Unverified",
    Icon: CircleAlert,
    cls: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
  },
  captcha_blocked: {
    label: "Blocked",
    Icon: ShieldX,
    cls: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
  },
  no_channel: {
    label: "No channel",
    Icon: FileX2,
    cls: "text-[var(--color-fg-muted)] bg-[var(--color-bg-alt)] border-[var(--color-border)]",
  },
  mailto_extracted: {
    label: "Email found",
    Icon: Mail,
    cls: "text-[var(--color-accent)] bg-[var(--color-accent-soft)] border-[var(--color-accent)]/25",
  },
  chatbot_detected: {
    label: "Chatbot",
    Icon: MessageSquare,
    cls: "text-[var(--color-accent)] bg-[var(--color-accent-soft)] border-[var(--color-accent)]/25",
  },
  chatbot_prefilled: {
    label: "Prefilled",
    Icon: MessageSquare,
    cls: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
  },
  low_relevance: {
    label: "Skipped",
    Icon: FileX2,
    cls: "text-[var(--color-fg-muted)] bg-[var(--color-bg-alt)] border-[var(--color-border)]",
  },
  suppressed: {
    label: "Suppressed",
    Icon: FileX2,
    cls: "text-[var(--color-fg-muted)] bg-[var(--color-bg-alt)] border-[var(--color-border)]",
  },
  daily_cap_hit: {
    label: "Daily cap",
    Icon: ShieldX,
    cls: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30",
  },
  failed: {
    label: "Failed",
    Icon: XCircle,
    cls: "text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30",
  },
  error: {
    label: "Failed",
    Icon: XCircle,
    cls: "text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30",
  },
};

function hostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toReceipt(lead: Tables<"leads">): Receipt {
  const raw = (lead.raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const rawStatus = (str(raw.submission_status) ?? "error") as SubmissionStatus;
  return {
    id: lead.id,
    business:
      lead.business_name ?? str(raw.business_name) ?? lead.website ?? "—",
    domain: hostname(lead.website),
    url: lead.website ?? str(raw.contact_page_url),
    status: rawStatus in STATUS_META ? rawStatus : "error",
    fieldsFilled: arr(raw.fields_filled),
    aiFields: arr(raw.ai_generated_fields),
    error: str(raw.error_message),
    submittedAt: str(raw.scraped_at),
    hasPrivateProof: isOutreachProofReference(str(raw.screenshot_url)),
  };
}

type Filter = "all" | "delivered" | "issues";

export function OutreachResults({ initialLeads }: OutreachResultsProps) {
  const receipts = useMemo(() => initialLeads.map(toReceipt), [initialLeads]);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    let delivered = 0,
      blocked = 0,
      contactOnly = 0,
      skipped = 0,
      failed = 0;
    for (const r of receipts) {
      if (r.status === "success" || r.status === "chatbot_sent") delivered++;
      else if (r.status === "captcha_blocked") blocked++;
      else if (
        r.status === "mailto_extracted" ||
        r.status === "chatbot_detected" ||
        r.status === "chatbot_prefilled"
      )
        contactOnly++;
      else if (
        r.status === "no_channel" ||
        r.status === "low_relevance" ||
        r.status === "suppressed" ||
        r.status === "daily_cap_hit"
      )
        skipped++;
      else failed++;
    }
    return {
      delivered,
      blocked,
      contactOnly,
      skipped,
      failed,
      total: receipts.length,
    };
  }, [receipts]);

  const shown = useMemo(() => {
    if (filter === "delivered")
      return receipts.filter(
        (r) => r.status === "success" || r.status === "chatbot_sent",
      );
    if (filter === "issues")
      return receipts.filter((r) => r.status !== "success");
    return receipts;
  }, [receipts, filter]);

  if (receipts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-fg-muted)]">
        No receipts yet.
      </p>
    );
  }

  const deliveredPct =
    counts.total > 0 ? Math.round((counts.delivered / counts.total) * 100) : 0;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat
          label="Delivered"
          value={counts.delivered}
          sub={`${deliveredPct}% of ${counts.total}`}
          tone="success"
        />
        <SummaryStat label="Blocked" value={counts.blocked} tone="warning" />
        <SummaryStat
          label="Contact only"
          value={counts.contactOnly}
          tone="accent"
        />
        <SummaryStat label="Skipped" value={counts.skipped} tone="muted" />
        <SummaryStat label="Failed" value={counts.failed} tone="danger" />
      </div>

      {/* Filter tabs */}
      <div className="mt-6 inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 text-xs">
        {(
          [
            ["all", `All ${counts.total}`],
            ["delivered", `Delivered ${counts.delivered}`],
            [
              "issues",
              `Issues ${counts.blocked + counts.contactOnly + counts.skipped + counts.failed}`,
            ],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3.5 py-1 transition-colors",
              filter === key
                ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Receipts */}
      <ul className="mt-4 divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {shown.map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.Icon;
          return (
            <li key={r.id} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium tracking-tight">
                    {r.business}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                      meta.cls,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
                  >
                    {r.domain ?? r.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-fg-subtle)]">
                  {(r.status === "success" || r.status === "chatbot_sent") && (
                    <span>
                      {r.fieldsFilled.length} field
                      {r.fieldsFilled.length === 1 ? "" : "s"} filled
                    </span>
                  )}
                  {r.aiFields.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                      <Sparkles className="h-3 w-3" />
                      {r.aiFields.length} AI-filled
                    </span>
                  )}
                  {r.submittedAt && (
                    <span>{new Date(r.submittedAt).toLocaleString()}</span>
                  )}
                  {r.error && (
                    <span className="text-[var(--color-danger)]">
                      {r.error}
                    </span>
                  )}
                </p>
              </div>
              {r.hasPrivateProof && (
                <a
                  href={`/api/outreach/proofs/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[11px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
                  title="View submission screenshot"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Proof
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone: "success" | "warning" | "danger" | "muted" | "accent";
}) {
  const toneCls = {
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    accent: "text-[var(--color-accent)]",
    muted: "text-[var(--color-fg)]",
  }[tone];
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          toneCls,
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-subtle)]">
          {sub}
        </p>
      )}
    </div>
  );
}
