/**
 * The wedge. A side-by-side that frames the whole product: the cold-email
 * way (a list of chores that end in the spam folder) vs the VibeLeads way
 * (describe a target, AI writes it, it lands in the form the owner reads).
 *
 * This is the single most important section on the page after the hero —
 * it's the argument for why contact-form outreach beats cold email. Kept
 * honest: no fabricated stats, no named-competitor bashing. Just the work
 * cold email actually requires vs. the work this removes.
 *
 * No images, no client JS — pure layout so it stays inside the landing
 * JS budget.
 */
import { X, Check, ArrowRight } from "lucide-react";

const OLD_WAY: string[] = [
  "Buy and age secondary domains for weeks",
  "Configure SPF, DKIM, DMARC — then pray",
  "Rotate inboxes and throttle send volume",
  "Pay for warm-up, verification, and spam tests",
  "Still land in Promotions, spam, or a block",
];

const NEW_WAY: string[] = [
  "Describe who you want to reach in plain English",
  "AI writes a message tailored to each business",
  "We submit it through their own contact form",
  "It lands in the inbox the owner actually checks",
  "You get a receipt for every send — start today",
];

export function ColdEmailContrast() {
  return (
    <section
      aria-labelledby="contrast-heading"
      className="border-y border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
            Why contact forms beat cold email
          </p>
          <h2
            id="contrast-heading"
            className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h2)]"
          >
            Cold email is a chore that ends in the spam folder.
          </h2>
          <p className="mt-3 text-balance text-[var(--color-fg-muted)]">
            A contact form is the channel a business put on its own site for
            exactly this. There&apos;s no filter between you and the owner.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-5 md:grid-cols-[1fr_auto_1fr]">
          {/* The old way */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-subtle)]">
              The cold-email way
            </p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-[var(--color-fg-muted)]">
              Weeks of setup, then deliverability roulette
            </h3>
            <ul className="mt-5 space-y-3">
              {OLD_WAY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-danger)]/12 text-[var(--color-danger)]">
                    <X className="h-3 w-3" />
                  </span>
                  <span className="text-[var(--color-fg-muted)] line-through decoration-[var(--color-fg-subtle)]/50">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow divider */}
          <div className="grid place-items-center py-2 md:py-0">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-accent)] shadow-[var(--shadow-card-hover)]">
              <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
            </span>
          </div>

          {/* The VibeLeads way */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-6 shadow-[0_24px_64px_-32px_oklch(56%_0.22_274_/_0.35)] sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--color-accent)]/10 blur-2xl"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent)]">
              The VibeLeads way
            </p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
              One prompt, straight to the owner&apos;s inbox
            </h3>
            <ul className="mt-5 space-y-3">
              {NEW_WAY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-[var(--color-fg)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
