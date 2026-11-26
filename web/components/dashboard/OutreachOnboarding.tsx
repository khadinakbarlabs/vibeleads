"use client";

/**
 * First-run activation checklist (onboarding-CRO).
 *
 * Drives the user to the aha moment — a first campaign that delivers —
 * in three value-ordered steps, quick win first. Reflects real account
 * state (profile set, campaign launched, message delivered), shows
 * progress, celebrates completion, and is dismissable. Auto-hides once
 * everything's done or after the account ages out.
 */

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  PartyPopper,
  UserRound,
  SendHorizonal,
  Inbox,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OutreachOnboardingProps {
  hasProfile: boolean;
  hasCampaign: boolean;
  hasDelivered: boolean;
  /** Server-computed: account is new enough to still show onboarding. */
  withinWindow: boolean;
  /** Current credit balance — drives the "your credits are ready" pull. */
  credits: number;
}

const DISMISS_KEY = "vl_outreach_onboarding_dismissed";
const DISMISS_EVENT = "vl-outreach-onboarding-dismiss";

/** External-store subscription for the localStorage dismiss flag. */
function subscribeDismiss(cb: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(DISMISS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

interface Step {
  key: string;
  done: boolean;
  title: string;
  body: string;
  href: string;
  cta: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function OutreachOnboarding({
  hasProfile,
  hasCampaign,
  hasDelivered,
  withinWindow,
  credits,
}: OutreachOnboardingProps) {
  // Server snapshot is always "not dismissed"; the client reads localStorage.
  // useSyncExternalStore avoids a setState-in-effect and re-renders when the
  // dismiss event fires (same tab) or another tab updates the flag.
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    () => localStorage.getItem(DISMISS_KEY) === "1",
    () => false,
  );

  const steps: Step[] = [
    {
      key: "profile",
      done: hasProfile,
      title: "Add your sender details",
      body: "Your name, email, phone, and website fill every contact form and sign every message.",
      href: "/settings",
      cta: "Set up profile",
      Icon: UserRound,
    },
    {
      key: "campaign",
      done: hasCampaign,
      title: "Launch your first campaign",
      body: "Describe who to reach. We find each business and submit your message through their contact form.",
      href: "/outreach/new",
      cta: "New campaign",
      Icon: SendHorizonal,
    },
    {
      key: "delivered",
      done: hasDelivered,
      title: "Watch it land",
      body: "See delivered, blocked, and no-form receipts per business as your campaign runs.",
      href: "/outreach",
      cta: "View campaigns",
      Icon: Inbox,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  // Hide when dismissed, fully complete, or the account has aged out.
  if (dismissed || allDone || !withinWindow) return null;

  // The next not-yet-done step is the highlighted call to action.
  const nextStep = steps.find((s) => !s.done) ?? null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <section
      aria-label="Getting started"
      className="glass-panel aurora relative mb-8 overflow-hidden p-5 sm:p-6"
      style={{ "--aurora-intensity": "0.3" } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss getting started"
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-[var(--color-fg-subtle)] transition-colors hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-fg)]"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <PartyPopper className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Get your first replies
          </h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            {!hasCampaign && credits > 0
              ? `Your ${credits.toLocaleString()} credits are ready — about ${credits.toLocaleString()} messages, on us.`
              : `${doneCount} of ${steps.length} done · two minutes to your first campaign`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-alt)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {steps.map((s) => {
          const isNext = nextStep?.key === s.key;
          const Icon = s.Icon;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                s.done
                  ? "border-[var(--color-border)] bg-[var(--color-surface)]/50"
                  : isNext
                    ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/40"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]",
              )}
            >
              <span className="shrink-0">
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--color-fg-subtle)]" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium tracking-tight",
                    s.done &&
                      "text-[var(--color-fg-muted)] line-through decoration-[var(--color-border-strong)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-70" />
                  {s.title}
                </p>
                {!s.done && (
                  <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                    {s.body}
                  </p>
                )}
              </div>
              {!s.done && (
                <Link href={s.href} className="shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium tracking-tight transition-colors",
                      isNext
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]"
                        : "border border-[var(--color-border-strong)] text-[var(--color-fg)] hover:bg-[var(--color-bg-alt)]",
                    )}
                  >
                    {s.cta}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
