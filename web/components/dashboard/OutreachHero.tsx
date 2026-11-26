"use client";

/**
 * Outreach-first dashboard hero. The primary action of the whole app:
 * say who you want to reach (+ optionally what you offer), and we hand
 * you off to the campaign wizard with targeting pre-filled.
 *
 * Prompt-first by design — the user "just tells us the ideal customer
 * profile." We do a light parse to seed the wizard:
 *   "<business type> in <location> — <pitch>"
 * Anything we can't confidently split is passed through as `pitch` so
 * the wizard never loses what the user typed; step 1 lets them correct
 * the split before a credit is ever spent.
 *
 * Distinct from PromptHero (the lead-gen search box): no enrichment
 * toggles, routes to /outreach/new, and the verb is "reach", not "find".
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal, ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CYCLING_PLACEHOLDERS = [
  "Dentists in Austin — I run their Google reviews and reputation.",
  "Marketing agencies in NYC — we white-label cold outreach for them.",
  "Independent gyms in Los Angeles — we fill their empty class slots.",
  "Law firms in Chicago — I build and maintain their websites.",
  "Boutique hotels in Miami — we manage their direct-booking funnels.",
];

/**
 * Split "<business> in <location> — <pitch>" into wizard params. Tolerant:
 * a missing location or pitch just yields fewer params. The em dash, the
 * hyphen-with-spaces, and " — " are all accepted as the pitch separator.
 */
function parseTarget(raw: string): {
  businessType?: string;
  location?: string;
  pitch?: string;
} {
  const text = raw.trim();
  if (!text) return {};

  // Split off the pitch on the first " - " / " — " / " – ".
  const pitchMatch = text.match(/\s+[—–-]\s+/);
  let targetPart = text;
  let pitch: string | undefined;
  if (pitchMatch && pitchMatch.index !== undefined) {
    targetPart = text.slice(0, pitchMatch.index).trim();
    pitch = text.slice(pitchMatch.index + pitchMatch[0].length).trim();
  }

  // Split target on the LAST " in " so "yoga studios in Brooklyn, NY" →
  // businessType "yoga studios", location "Brooklyn, NY".
  const inIdx = targetPart.toLowerCase().lastIndexOf(" in ");
  if (inIdx > 0) {
    return {
      businessType: targetPart.slice(0, inIdx).trim(),
      location: targetPart.slice(inIdx + 4).trim(),
      pitch,
    };
  }
  return { businessType: targetPart || undefined, pitch };
}

export function OutreachHero() {
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (value) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CYCLING_PLACEHOLDERS.length);
    }, 4_500);
    return () => window.clearInterval(id);
  }, [value]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        taRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function submit() {
    const trimmed = value.trim();
    if (trimmed.length < 6) return;
    startTransition(() => {
      const parsed = parseTarget(trimmed);
      const params = new URLSearchParams();
      if (parsed.businessType) params.set("businessType", parsed.businessType);
      if (parsed.location) params.set("location", parsed.location);
      if (parsed.pitch) params.set("pitch", parsed.pitch);
      // Always carry the raw text so nothing is lost if the parse is off.
      params.set("prompt", trimmed);
      router.push(`/outreach/new?${params.toString()}`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-x-12 -top-12 -bottom-6 -z-10 rounded-[40px] [background-image:radial-gradient(60%_70%_at_50%_0%,oklch(56%_0.22_274_/_0.10),transparent_70%)]"
      />

      <div
        className="glass-panel aurora overflow-hidden p-1"
        style={{ "--aurora-intensity": "0.4" } as React.CSSProperties}
      >
        <div className="rounded-[22px] bg-[var(--color-bg)]/85 p-5 backdrop-blur-md sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <SendHorizonal className="h-4 w-4" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
              new campaign
            </span>
            <span className="ml-auto hidden font-mono text-[10px] text-[var(--color-fg-subtle)] sm:inline">
              ⌘K to focus · ⌘↵ to continue
            </span>
          </div>

          <div className="relative">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              autoFocus
              disabled={pending}
              maxLength={400}
              aria-label="Describe who you want to reach"
              placeholder="Describe who you want to reach"
              className="block w-full resize-none border-0 bg-transparent p-0 font-mono text-[15px] leading-relaxed text-[var(--color-fg)] placeholder:text-transparent focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            {!value && !pending && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 font-mono text-[15px] leading-relaxed text-[var(--color-fg-subtle)]"
              >
                <span key={placeholderIdx} className="block animate-fade-in">
                  {CYCLING_PLACEHOLDERS[placeholderIdx]}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              AI writes the message — you just say who to reach.
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={value.trim().length < 6 || pending}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-tight transition-all",
                "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
                "shadow-[0_1px_0_0_oklch(45%_0.22_274_/_0.6)_inset,0_8px_24px_-8px_oklch(56%_0.22_274_/_0.5)]",
                "hover:bg-[var(--color-accent-hover)] active:translate-y-px",
                "disabled:cursor-not-allowed disabled:bg-[var(--color-fg-subtle)] disabled:shadow-none",
              )}
            >
              {pending ? "Opening…" : "Set up campaign"}
              {!pending && <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
