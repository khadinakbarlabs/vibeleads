/**
 * Social-proof + trust-signal row. Sits below the hero on the marketing
 * landing. Uses REAL functional metrics (data-source count, export
 * destinations, sample-scenario count) plus three trust pillars
 * (refund policy, source-transparency, no annual lock-in) — no
 * fabricated testimonials, no fake user-count claims.
 *
 * Numbers reflect the contact-form outreach product: target-discovery
 * sources that feed the same submission pipeline, plus ready-to-copy
 * targeting prompts.
 */
import {
  CheckCircle2,
  Compass,
  Database,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

// Discovery sources that feed the contact-form pipeline (Maps, web,
// LinkedIn, Product Hunt, …). Kept as a copy-facing constant so the
// landing stat stays accurate independent of the actor registry.
const dataSourceCount = 5;

interface Stat {
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STATS: Stat[] = [
  {
    value: "0",
    label:
      "domains, inboxes, or warm-up days — outreach goes out the moment you launch",
    Icon: Workflow,
  },
  {
    value: `${dataSourceCount}`,
    label:
      "ways to find your targets — Maps, web, LinkedIn, Product Hunt, and more feed the same contact-form pipeline",
    Icon: Database,
  },
  {
    value: "100+",
    label:
      "ready-to-copy targeting prompts — local services, B2B SaaS, agencies, and more",
    Icon: Compass,
  },
];

const PILLARS: {
  title: string;
  body: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    title: "Pay only for sends that land",
    body: "CAPTCHA-walled and form-less sites are skipped and never billed. Your credits go to submissions that actually went through.",
    Icon: ShieldCheck,
  },
  {
    title: "Replies come straight to you",
    body: "We fill each form with your real name and email, then step out. Every reply lands in your inbox — we never sit in the middle.",
    Icon: Sparkles,
  },
  {
    title: "A channel they opted into",
    body: "You're using the contact form a business published for inquiries. No purchased lists, no scraped inboxes, no spam-trap risk.",
    Icon: CheckCircle2,
  },
];

export function SocialProofRow() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="border-y border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
            Why teams pick VibeLeads
          </p>
          <h2
            id="trust-heading"
            className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h2)]"
          >
            Built so you don&apos;t have to babysit it.
          </h2>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((s) => {
            const Icon = s.Icon;
            return (
              <li
                key={s.label}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <Icon aria-hidden className="h-4 w-4" />
                  </span>
                  <span
                    className="font-mono text-3xl font-semibold tabular-nums tracking-tight"
                    aria-label={s.label}
                  >
                    {s.value}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                  {s.label}
                </p>
              </li>
            );
          })}
        </ul>

        <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.Icon;
            return (
              <li
                key={p.title}
                className="flex flex-col gap-2 bg-[var(--color-surface)] p-6"
              >
                <Icon
                  aria-hidden
                  className="h-4 w-4 text-[var(--color-success)]"
                />
                <h3 className="text-sm font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
                  {p.body}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
          Built on{" "}
          <span className="text-[var(--color-fg-muted)]">Anthropic Claude</span>
          {" · "}
          <span className="text-[var(--color-fg-muted)]">Stripe</span>
          {" · "}
          <span className="text-[var(--color-fg-muted)]">Supabase</span>
        </p>
      </div>
    </section>
  );
}
