/**
 * Demo hub. Visitors arriving via the marketing "View demo" link land
 * here. The product is contact-form outreach, so the demo focuses on
 * that: the live campaign pipeline (discover → write → submit).
 *
 * Each card pairs a Lucide icon with a short pitch + the auto-time of
 * that demo so visitors know what they're committing to.
 */
import Link from "next/link";
import { ArrowUpRight, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TONE_CLASS, type Tone } from "@/lib/ui/tone";

interface DemoEntry {
  href: string;
  title: string;
  pitch: string;
  /** Lucide icon used in the tile glyph. */
  Icon: React.ComponentType<{ className?: string }>;
  /** Tone token for the icon tile. */
  tone: Extract<Tone, "violet" | "amber" | "sky" | "emerald">;
  /** Approx duration of the demo so visitors know what they're committing to. */
  duration: string;
  /** Whether this demo lets the user click through real interactions. */
  interactive?: boolean;
}

const DEMOS: DemoEntry[] = [
  {
    href: "/demo/outreach",
    Icon: Send,
    tone: "sky",
    title: "Run a campaign",
    pitch:
      "Describe who to reach, then watch VibeLeads find each business, write a tailored message, and submit it through their contact form across 12 studios. The receipts table shows delivered / blocked / no-form status per business.",
    duration: "Auto · ~25s",
    interactive: true,
  },
];

export default function DemoHubPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
          Demos
        </p>
        <h1 className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h1)]">
          See it work, no signup
        </h1>
        <p className="mt-3 max-w-2xl text-balance text-base text-[var(--color-fg-muted)]">
          Watch a full contact-form outreach campaign run end to end, or click
          through the real workspace against sample data. No account needed.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {DEMOS.map((demo) => {
          const Icon = demo.Icon;
          return (
            <li key={demo.href}>
              <Link
                href={demo.href}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all",
                  "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]",
                  "motion-reduce:hover:translate-y-0",
                )}
              >
                <header className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-[var(--color-border)]",
                      TONE_CLASS[demo.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold tracking-tight">
                      {demo.title}
                    </h2>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
                      {demo.duration}
                    </p>
                  </div>
                  {demo.interactive && (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                      interactive
                    </span>
                  )}
                </header>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                  {demo.pitch}
                </p>

                <footer className="mt-4 flex items-center text-xs text-[var(--color-fg)]">
                  <span className="font-mono uppercase tracking-[0.18em] text-[var(--color-accent)]">
                    Open demo
                  </span>
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-[var(--color-accent)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </footer>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-alt)]/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight">
          The demo uses sample data
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
          The campaign demo replays a real run at calm pacing so you can see
          exactly what you&apos;ll see when you launch your own — the same live
          counters, rotating status copy, and step rail the real app uses.
          Nothing here touches the live database.
        </p>
        <p className="mt-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] underline-offset-4 hover:underline"
          >
            Sign in to launch a campaign
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </section>
    </div>
  );
}

export const metadata = {
  title: "Demos — see VibeLeads work without signing up",
  description:
    "Watch a contact-form outreach campaign run end to end, plus a full workspace tour — no account needed.",
};
