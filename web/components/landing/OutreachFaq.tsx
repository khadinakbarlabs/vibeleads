/**
 * Objection-handling FAQ for the landing page. Answers the questions
 * every cold-outreach buyer asks before they trust a new channel: is this
 * spam, will it burn my domain, what about CAPTCHA, what if there's no
 * form, where do replies go, and how is this different from the cold-email
 * tool I already pay for.
 *
 * Uses native <details>/<summary> so it works with zero client JS and
 * stays keyboard- and screen-reader-accessible by default.
 */
import { Plus } from "lucide-react";

interface Qa {
  q: string;
  a: string;
}

const FAQS: Qa[] = [
  {
    q: "Isn't this just spam?",
    a: "No. A contact form is the channel a business published on its own site to receive inquiries. You send one message, at a volume you cap, from your real name and email — not a scraped-list blast. It reads as a genuine inquiry because it is one.",
  },
  {
    q: "Will this hurt my domain reputation?",
    a: "There's no email domain involved on your side, so there's nothing to warm up and nothing to burn. Your messages never touch a mail server you own — they post directly into each business's website form.",
  },
  {
    q: "What happens with CAPTCHA-protected forms?",
    a: "They're skipped and reported back as captcha_blocked. You only spend credits on forms that were actually submitted, so a wall of protected sites never quietly drains your balance.",
  },
  {
    q: "What if a business has no contact form?",
    a: "We try the next-best way in: a website chatbot if one's there, or we capture the business's email so you can follow up directly. More of your list actually gets reached instead of stalling on a missing form — and you still only pay for the ones we get through to.",
  },
  {
    q: "Where do replies go?",
    a: "Straight to the email you put in your sender identity. We fill the form with your real address and step out of the way — we never intercept, proxy, or sit in the middle of the conversation.",
  },
  {
    q: "How is this different from Instantly or Smartlead?",
    a: "Those tools send email and spend their lives fighting spam filters and deliverability. VibeLeads skips email entirely and delivers through the contact form the owner already monitors. No warm-up, no inbox rotation, no deliverability score to babysit.",
  },
  {
    q: "Do I get proof each message was sent?",
    a: "Every campaign returns a row per business — delivered, blocked, or unreachable — and you can turn on a screenshot of each successful submission for auditable receipts when you run outreach for clients.",
  },
];

export function OutreachFaq() {
  return (
    <section aria-labelledby="faq-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
            Before you ask
          </p>
          <h2
            id="faq-heading"
            className="mt-2 text-balance font-semibold tracking-[-0.02em] text-[length:var(--text-h2)]"
          >
            The questions everyone asks first.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {FAQS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--color-bg-alt)]">
                <span className="text-[15px] font-medium tracking-tight">
                  {item.q}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] transition-transform duration-200 group-open:rotate-45">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
