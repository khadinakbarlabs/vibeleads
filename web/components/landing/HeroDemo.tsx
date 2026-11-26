"use client";

/**
 * Animated hero card for the marketing landing. Cycles through:
 *   1. types an outreach prompt character-by-character (~22ms/char)
 *   2. shows a "running…" beam
 *   3. counters animate up to their target values (LiveCounter)
 *   4. holds for 4s, then fades + restarts
 *
 * The three counters mirror the real contact-form pipeline:
 *   Found    → businesses + their contact pages discovered
 *   Written  → messages AI tailored per business
 *   Submitted → forms successfully filled + sent (rest were
 *               captcha-blocked or had no form)
 *
 * Honors prefers-reduced-motion: when reduced, displays the final state
 * immediately and skips the cycle.
 */
import { useEffect, useState } from "react";
import { LiveCounter } from "@/components/motion/LiveCounter";
import { BreathingBar } from "@/components/motion/BreathingBar";
import { cn } from "@/lib/utils/cn";

interface Scene {
  prompt: string;
  found: number;
  written: number;
  submitted: number;
  submittedLabel: string;
}

const SCENES: Scene[] = [
  {
    prompt: "Reach every dental clinic in Miami with a partnership offer.",
    found: 218,
    written: 218,
    submitted: 174,
    submittedLabel: "Delivered",
  },
  {
    prompt: "Message marketing agencies in NYC about our white-label service.",
    found: 140,
    written: 140,
    submitted: 121,
    submittedLabel: "Delivered",
  },
  {
    prompt: "Contact independent gyms in LA — we fill empty class slots.",
    found: 96,
    written: 96,
    submitted: 88,
    submittedLabel: "Delivered",
  },
];

const CHAR_MS = 22;
const HOLD_MS = 4200;
const RUN_MS = 1200;

export function HeroDemo() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [phase, setPhase] = useState<"typing" | "running" | "done">("typing");

  const scene = SCENES[sceneIdx];
  // Snapshot counter targets per phase: only animate when phase === 'done'.
  const counters =
    phase === "done"
      ? scene
      : {
          found: 0,
          written: 0,
          submitted: 0,
          submittedLabel: scene.submittedLabel,
        };

  // Typing tween — advance one character at a time.
  // We use an interval so the setState only fires from a timer callback,
  // never synchronously inside the effect body.
  useEffect(() => {
    if (phase !== "typing") return;
    const interval = setInterval(() => {
      setTypedLen((n) => {
        if (n + 1 >= scene.prompt.length) {
          // Schedule the phase flip in a microtask so we don't double-set.
          queueMicrotask(() => setPhase("running"));
          return scene.prompt.length;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => clearInterval(interval);
  }, [phase, scene.prompt.length]);

  // Running -> done after RUN_MS, then hold and rotate.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setTimeout(() => setPhase("done"), RUN_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => {
      setSceneIdx((i) => (i + 1) % SCENES.length);
      setTypedLen(0);
      setPhase("typing");
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const typed = scene.prompt.slice(0, typedLen);

  return (
    <div
      className="glass-panel aurora overflow-hidden p-1"
      style={{ "--aurora-intensity": "0.5" } as React.CSSProperties}
    >
      <div className="relative rounded-xl bg-[var(--color-bg-alt)]/80 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[var(--color-fg-subtle)]">
          <span className="font-mono uppercase tracking-[0.2em]">prompt</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            {phase === "running"
              ? "in flight"
              : phase === "done"
                ? "complete"
                : "typing"}
          </span>
        </div>
        <p className="font-mono text-[13px] leading-relaxed text-[var(--color-fg)] min-h-[60px]">
          {typed}
          {phase === "typing" && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3.5 w-px bg-[var(--color-fg)] align-middle motion-safe:animate-pulse motion-reduce:opacity-0"
            />
          )}
        </p>
        {phase !== "typing" && (
          <div className="mt-3">
            <BreathingBar value={phase === "done" ? 1 : undefined} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-[var(--color-border)] p-px">
        <HeroStat label="Found" value={counters.found} />
        <HeroStat label="Written" value={counters.written} />
        <HeroStat
          label="Submitted"
          value={counters.submitted}
          subLabel={counters.submittedLabel}
        />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  subLabel,
}: {
  label: string;
  value: number;
  subLabel?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 bg-[var(--color-surface)] p-4")}>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
        <LiveCounter value={value} />
      </span>
      {subLabel && (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
          {subLabel}
        </span>
      )}
    </div>
  );
}
