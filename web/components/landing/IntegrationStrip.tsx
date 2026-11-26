/**
 * "Trusted by / push leads into" strip for the landing page. Each integration
 * gets a chip with a brand-colored dot, the wordmark in a deliberate type
 * treatment, and a one-line role tag. No external images so the marketing
 * page stays under the JS budget.
 *
 * Brand colors are sampled from each tool's primary identity color but
 * deliberately desaturated to fit our calm palette.
 */
import { cn } from "@/lib/utils/cn";

interface Item {
  name: string;
  tagline: string;
  /** Tailwind-safe inline color (we feed this directly to bg-[--var]). */
  dot: string;
}

const ITEMS: Item[] = [
  { name: "Instantly", tagline: "Cold email", dot: "oklch(60% 0.18 15)" },
  { name: "Smartlead", tagline: "Cold email", dot: "oklch(58% 0.18 252)" },
  { name: "Apollo", tagline: "Sales intelligence", dot: "oklch(60% 0.16 152)" },
  {
    name: "Lemlist",
    tagline: "Personalized outreach",
    dot: "oklch(60% 0.18 75)",
  },
  { name: "Reply.io", tagline: "Multi-channel", dot: "oklch(58% 0.18 274)" },
  {
    name: "Mailshake",
    tagline: "Sales engagement",
    dot: "oklch(60% 0.16 220)",
  },
  { name: "Snov.io", tagline: "Email + drip", dot: "oklch(58% 0.16 145)" },
  { name: "GMass", tagline: "Gmail-native", dot: "oklch(58% 0.18 25)" },
  { name: "Sheets", tagline: "Google Sheets", dot: "oklch(58% 0.16 145)" },
  { name: "Webhook", tagline: "Zapier · Make · n8n", dot: "oklch(60% 0 0)" },
];

export function IntegrationStrip() {
  return (
    <div className="border-y border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 py-12">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
        Push leads into the tools you already pay for
      </p>
      <ul
        className={cn(
          "mx-auto mt-6 flex max-w-6xl flex-wrap items-stretch justify-center gap-2 px-6",
        )}
      >
        {ITEMS.map((it) => (
          <li key={it.name}>
            <span
              className={cn(
                "group inline-flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 transition-all",
                "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]",
                "motion-reduce:hover:translate-y-0",
              )}
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: it.dot }}
              />
              <span className="text-sm font-medium tracking-[-0.005em] text-[var(--color-fg)]">
                {it.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
                {it.tagline}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
