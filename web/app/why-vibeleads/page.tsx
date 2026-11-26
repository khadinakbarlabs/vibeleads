/**
 * Public-facing competitive comparison page.
 *
 * The thinking lives in `docs/strategy/COMPETITORS.md` (full
 * feature-by-feature analysis) and `docs/strategy/POSITIONING.md`
 * (verbal positioning). This page is the user-visible distillation —
 * five sections in order of how a prospect actually evaluates:
 *
 *   1. Hero with the one-line USP
 *   2. The "different game" framing — why we're not in the same lane
 *   3. The grid — VibeLeads vs Apollo / Clay / Hunter / Instantly
 *      across the eight axes that matter
 *   4. What we do better, in three sentences each
 *   5. What we DON'T do (and where to go instead)
 *   6. CTA
 *
 * Last section is the trust move — naming the gaps openly is more
 * persuasive than pretending we replace every competitor at every
 * task. POSITIONING.md item 6 (objection handling) backs this.
 *
 * Server component. No client interactivity needed; the visual
 * upgrade comes from the glass aesthetic on the comparison cards.
 */
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  X,
  Minus,
  Sparkles,
  Database,
  Send,
  Receipt,
  Clock,
  Zap,
  Target,
  ShieldCheck,
} from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

type CellState = "yes" | "no" | "partial" | "n/a";

interface CompetitorRow {
  axis: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  vibeleads: { state: CellState; note?: string };
  apollo: { state: CellState; note?: string };
  clay: { state: CellState; note?: string };
  hunter: { state: CellState; note?: string };
  instantly: { state: CellState; note?: string };
}

const COMPARISON: CompetitorRow[] = [
  {
    axis: "Live data on every search",
    Icon: Clock,
    description:
      "Source-of-truth queries hit Google Maps, LinkedIn, and the live web at run time — no cached graph that decays.",
    vibeleads: { state: "yes", note: "median lead age <60s" },
    apollo: { state: "no", note: "230M cached, ~30%/yr decay" },
    clay: { state: "partial", note: "via 3rd-party connectors" },
    hunter: { state: "yes" },
    instantly: { state: "no" },
  },
  {
    axis: "Plain-English prompt",
    Icon: Sparkles,
    description:
      "Type your audience in plain English; we pick the right data source + filters automatically.",
    vibeleads: { state: "yes" },
    apollo: { state: "no", note: "filter-tree UI" },
    clay: { state: "partial", note: "AI cells, manual flow" },
    hunter: { state: "no" },
    instantly: { state: "no" },
  },
  {
    axis: "Contact-form auto-submit",
    Icon: Send,
    description:
      "Submit your message through the prospect's contact form — first-touch delivered, no inbox to filter past.",
    vibeleads: { state: "yes", note: "unique to us" },
    apollo: { state: "no" },
    clay: { state: "no" },
    hunter: { state: "no" },
    instantly: { state: "no" },
  },
  {
    axis: "Per-task cost transparency",
    Icon: Receipt,
    description:
      "Every leg of the recipe shows credit weight. Estimate before run; ledger after.",
    vibeleads: { state: "yes" },
    apollo: { state: "no", note: "flat seat fee" },
    clay: { state: "partial", note: "per-cell credits" },
    hunter: { state: "yes" },
    instantly: { state: "no" },
  },
  {
    axis: "Output column preview",
    Icon: Database,
    description:
      "See exactly which columns the run will return BEFORE spending a credit.",
    vibeleads: { state: "yes", note: "shown before any run" },
    apollo: { state: "partial" },
    clay: { state: "yes" },
    hunter: { state: "yes" },
    instantly: { state: "no" },
  },
  {
    axis: "Local-business coverage",
    Icon: Target,
    description:
      "Restaurants, gyms, dentists, plumbers, agencies — everything with a Google Maps listing.",
    vibeleads: { state: "yes", note: "Google Maps coverage" },
    apollo: { state: "partial", note: "B2B-skewed" },
    clay: { state: "partial" },
    hunter: { state: "no", note: "domains-only" },
    instantly: { state: "no" },
  },
  {
    axis: "Refund-on-fail credits",
    Icon: ShieldCheck,
    description:
      "Bad email? Disconnected number? Captcha-blocked form? Credit returns automatically.",
    vibeleads: { state: "yes" },
    apollo: { state: "no" },
    clay: { state: "no" },
    hunter: { state: "partial", note: "for unverified" },
    instantly: { state: "n/a" },
  },
  {
    axis: "Pay-as-you-go pricing",
    Icon: Zap,
    description:
      "No annual contract, no per-seat upcharge, no minimum. Cancel any time.",
    vibeleads: { state: "yes" },
    apollo: { state: "no", note: "annual contracts" },
    clay: { state: "partial", note: "monthly tiers" },
    hunter: { state: "yes" },
    instantly: { state: "yes" },
  },
];

export default function WhyVibeLeadsPage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <LogoMark size={28} />
          VibeLeads
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/demo"
            className="hidden px-3 py-2 text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)] sm:inline"
          >
            View demo
          </Link>
          <ThemeToggle size="sm" />
          <Link href="/login">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 sm:px-10">
        {/* Hero */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            How we&apos;re different
          </p>
          <h1 className="max-w-4xl text-balance font-semibold leading-[1.02] tracking-[-0.03em] text-[length:var(--text-h1)] sm:text-[length:var(--text-display)]">
            Lead data is stale the moment you cache it.
            <br />
            <span className="text-[var(--color-fg-muted)]">
              We don&apos;t cache.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-balance text-[length:var(--text-body-lg)] text-[var(--color-fg-muted)]">
            Apollo, ZoomInfo, Lusha, Cognism — every database vendor sells you a
            snapshot of the contact graph as it was 6–18 months ago. We scrape
            Google Maps, LinkedIn, and the open web on every search, validate
            every contact, then submit your message through the prospect&apos;s
            actual contact form. No cached graph. No decay. Different game.
          </p>
        </section>

        {/* The "different game" framing */}
        <section
          className="glass-panel aurora my-8 overflow-hidden p-6 sm:p-10"
          style={{ "--aurora-intensity": "0.4" } as React.CSSProperties}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
            the different game
          </p>
          <h2 className="mt-2 max-w-3xl text-balance text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Three things competitors structurally cannot copy quickly
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Pillar
              Icon={Sparkles}
              title="Plain-English routing"
              body="Type your audience. We pick the right data source, build the recipe, and run the pipeline. Apollo's product is a filter tree. Clay's is a flow chart. Ours is a sentence."
            />
            <Pillar
              Icon={Send}
              title="Contact-form auto-submit"
              body="Every other tool stops at the CSV. We open each contact form, fill the standard fields, intelligently answer custom ones, submit, and report per-target receipts."
            />
            <Pillar
              Icon={Receipt}
              title="Per-task cost ledger"
              body="Every leg of every recipe shows its credit weight. Estimate before run, ledger after. Bad email? Refund. The whole product is built on cost transparency."
            />
          </ul>
        </section>

        {/* The comparison grid */}
        <section className="mt-16 mb-12 sm:mt-24 sm:mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
            head-to-head
          </p>
          <h2 className="mt-2 max-w-3xl text-balance text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            The eight axes that matter
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">
            Live data, plain-English, contact-form delivery, cost transparency,
            output preview, local coverage, refund logic, pricing model.
          </p>

          <div className="glass-card mt-8 overflow-x-auto p-4 sm:p-6">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-3 pr-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
                    Capability
                  </th>
                  <ColHeader name="VibeLeads" highlighted />
                  <ColHeader name="Apollo" />
                  <ColHeader name="Clay" />
                  <ColHeader name="Hunter" />
                  <ColHeader name="Instantly" />
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr
                    key={row.axis}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="py-4 pr-4 align-top">
                      <div className="flex items-start gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                          <row.Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium tracking-tight">
                            {row.axis}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-fg-muted)]">
                            {row.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <Cell value={row.vibeleads} highlighted />
                    <Cell value={row.apollo} />
                    <Cell value={row.clay} />
                    <Cell value={row.hunter} />
                    <Cell value={row.instantly} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-fg-subtle)]">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-[var(--color-success)]" />
              full
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Minus className="h-3 w-3 text-[var(--color-warning)]" />
              partial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3 w-3 text-[var(--color-fg-subtle)]" />
              not offered
            </span>
          </p>
        </section>

        {/* What we DON'T do — the trust move */}
        <section className="mt-16 mb-12 sm:mt-20 sm:mb-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
            honest gaps
          </p>
          <h2 className="mt-2 max-w-3xl text-balance text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            What we don&apos;t do — and where to go instead
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">
            We&apos;d rather you pick the right tool than oversell. Three cases
            where another tool wins:
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <HonestGap
              title="ABM with persistent contact graph"
              recommend="Apollo or ZoomInfo"
              reason="200 enterprise accounts worked over 12 months want a stable graph. We're a fresh-list-on-demand engine, not a CRM-of-prospects."
            />
            <HonestGap
              title="Cold-email sending infrastructure"
              recommend="Instantly or Smartlead"
              reason="Warmed inboxes, sequencing, throttle, reply detection — that's their core. We export into them so the stack splits cleanly: find (us) → send (them)."
            />
            <HonestGap
              title="Custom multi-source enrichment workflows"
              recommend="Clay"
              reason="If you need a 14-step recipe with custom JS and column-by-column choices, Clay's flow-chart UX wins. Above our 22-strategy ceiling, theirs."
            />
          </ul>
        </section>

        {/* CTA */}
        <section
          className="glass-panel aurora my-12 overflow-hidden p-8 text-center sm:p-12"
          style={{ "--aurora-intensity": "0.55" } as React.CSSProperties}
        >
          <h2 className="text-balance text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Try it on a real prompt
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-[var(--color-fg-muted)]">
            100 credits free, no card. Type your ICP, see the parsed plan,
            decide if the cost makes sense before any credit is spent.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg">
                Start free — 100 credits
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="secondary">
                View the live demo
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">
            No credit card. Cancel any time. No annual contract.
          </p>
        </section>
      </main>

      <footer className="mx-auto mt-12 mb-12 w-full max-w-7xl px-6 text-sm text-[var(--color-fg-subtle)] sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-6">
          <p>© {new Date().getFullYear()} VibeLeads</p>
          <nav className="flex items-center gap-5">
            <Link href="/demo" className="hover:text-[var(--color-fg)]">
              Demo
            </Link>
            <Link href="/login" className="hover:text-[var(--color-fg)]">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

function ColHeader({
  name,
  highlighted,
}: {
  name: string;
  highlighted?: boolean;
}) {
  return (
    <th
      scope="col"
      className={
        "py-3 px-3 text-center font-medium tracking-tight " +
        (highlighted
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-fg-muted)]")
      }
    >
      {name}
    </th>
  );
}

function Cell({
  value,
  highlighted,
}: {
  value: { state: CellState; note?: string };
  highlighted?: boolean;
}) {
  const Icon =
    value.state === "yes"
      ? Check
      : value.state === "no"
        ? X
        : value.state === "partial"
          ? Minus
          : Minus;
  const tone =
    value.state === "yes"
      ? "text-[var(--color-success)]"
      : value.state === "no"
        ? "text-[var(--color-fg-subtle)]"
        : value.state === "partial"
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-fg-subtle)]";
  return (
    <td
      className={
        "py-4 px-3 align-top text-center " +
        (highlighted ? "bg-[var(--color-accent-soft)]/30" : "")
      }
    >
      <div className="flex flex-col items-center gap-1">
        <Icon className={"h-4 w-4 " + tone} />
        {value.note && (
          <span className="text-[11px] text-[var(--color-fg-subtle)]">
            {value.note}
          </span>
        )}
      </div>
    </td>
  );
}

function Pillar({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li>
      <span className="glass-pill grid h-10 w-10 place-items-center text-[var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-base font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
        {body}
      </p>
    </li>
  );
}

function HonestGap({
  title,
  recommend,
  reason,
}: {
  title: string;
  recommend: string;
  reason: string;
}) {
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
        instead try
      </p>
      <p className="mt-1.5 text-sm font-semibold tracking-tight text-[var(--color-accent)]">
        {recommend}
      </p>
      <p className="mt-3 font-medium tracking-tight">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
        {reason}
      </p>
    </li>
  );
}

export const metadata = {
  title: "Why VibeLeads",
  description:
    "Live-scrape lead data, plain-English prompts, and contact-form auto-submit — vs Apollo, Clay, Hunter, and Instantly. The honest comparison.",
  openGraph: {
    title: "Why VibeLeads — vs Apollo, Clay, Hunter, Instantly",
    description:
      "Live-scrape lead data + plain-English prompts + contact-form delivery. The capability-by-capability comparison.",
  },
};
