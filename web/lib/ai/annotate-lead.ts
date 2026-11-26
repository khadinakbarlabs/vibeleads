/**
 * Lead annotator. Given a user's original prompt + a lead row, asks
 * Claude Haiku for a one-line "why this is a fit" summary that we
 * display under the lead's name in the CRM grid + the LiveArrivals
 * stream.
 *
 * Why the resolved-filters input matters
 *
 *   The prompt the USER typed and the filters we ACTUALLY applied can
 *   diverge — the resolver auto-drops impossible combos (e.g. the
 *   classic `no_website + has_email` contradiction). If we feed Haiku
 *   only the raw prompt, it judges leads against criteria we already
 *   decided to ignore — every annotation comes back as "doesn't match
 *   your criteria" even though the lead is in the result set because
 *   we DELIBERATELY dropped the contradictory filter. Caught in prod
 *   May 13.
 *
 *   So we pass BOTH the raw prompt (for tone / topic) AND the resolved
 *   filter decision so the annotator knows which criteria actually
 *   gated the row's inclusion.
 *
 * Design choices:
 *   - Haiku, not Sonnet. We're labeling 10-50 leads per search, fast
 *     and cheap matters more than depth.
 *   - One-line, ≤90 chars. Anything longer crowds the grid.
 *   - System prompt has the JOB description + format rules; the user
 *     turn carries the user's prompt, the resolved filters, and the
 *     lead facts. Caches the system prompt across leads in the same
 *     search.
 *   - Returns null on failure — the row already exists in the grid;
 *     the annotation is a nice-to-have, not a blocker.
 */
import { anthropic, MODELS } from "./client";
import type { NormalizedLead } from "@/lib/normalize/types";
import type { PostFilterContradiction } from "@/lib/normalize/post-filters-resolve";
import type { PostFilters } from "@/lib/normalize/post-filters";

const SYSTEM_PROMPT = `You annotate sales leads with a one-line POSITIVE "why this is a fit" summary.

You will receive:
  - the user's original prompt
  - the RESOLVED filters we actually applied (after dropping impossible combos)
  - the lead facts

Hard rules:
- Maximum 90 characters. No exceptions.
- Plain English. No marketing fluff. No exclamation marks. No emoji.
- The lead IS in the result set, which means it matches the RESOLVED filters.
  Lead with what matches, not what doesn't.
- Reference ONE concrete fact (rating, review count, location specificity, has
  emails, has phone, category) that the user would care about.
- Never say "doesn't match" or "doesn't fit". The lead is here because we kept
  it after resolving conflicts in the prompt — saying it doesn't fit is wrong.
- If the user's prompt mentioned a criterion we DROPPED during resolution
  (e.g. user said "no website" but we kept "has_email" instead), do NOT
  evaluate the lead against the dropped criterion. The resolution is final.
- Don't restate the obvious ("this is a yoga studio"). Tell the user what's
  specifically interesting about THIS lead for THEIR query.
- Never invent facts. If you're not sure, output a generic one-liner.
- Output the one line of text directly. No labels, no quotes, no markdown.`;

interface AnnotateInput {
  /** The user's original prompt — drives topic / tone interpretation. */
  prompt: string;
  /**
   * Resolved post-filters the lead actually passed. The annotator uses
   * these (not the raw prompt) to decide "fit". Optional but strongly
   * recommended — without it the annotator may contradict the
   * resolver.
   */
  resolvedFilters?: PostFilters | null;
  /**
   * Any contradictions the resolver auto-fixed. Annotator uses this to
   * AVOID evaluating against criteria the user typed but we dropped.
   */
  contradictions?: PostFilterContradiction[];
  /** The lead being annotated. */
  lead: Pick<
    NormalizedLead,
    | "business_name"
    | "category"
    | "categories"
    | "city"
    | "rating"
    | "review_count"
    | "website"
    | "emails"
    | "phones"
    | "description"
  >;
}

/**
 * Convert the resolved-filter object into a compact, model-friendly
 * description ("kept: has_email, min_reviews; dropped: no_website") so
 * Haiku doesn't have to read JSON to understand what we filtered on.
 */
function describeFilters(
  resolved: PostFilters | null | undefined,
  contradictions: PostFilterContradiction[] | undefined,
): string {
  const keptKeys = resolved
    ? Object.entries(resolved)
        .filter(
          ([k, v]) =>
            v !== undefined &&
            v !== null &&
            v !== false &&
            k !== "limit" &&
            // Internal book-keeping — never surface to the model.
            !k.startsWith("_"),
        )
        .map(([k]) => k)
    : [];
  const droppedKeys = (contradictions ?? []).map((c) => String(c.dropped));

  const keptLine = keptKeys.length
    ? `kept (these gated the lead's inclusion): ${keptKeys.join(", ")}`
    : "kept: (no positive filters — anything from the source passes)";
  const droppedLine = droppedKeys.length
    ? `dropped during resolution (do NOT judge against these): ${droppedKeys.join(", ")}`
    : null;

  return [keptLine, droppedLine].filter(Boolean).join("\n");
}

/**
 * Returns a one-line fit summary, or null if Anthropic is unavailable /
 * the call fails. Callers should treat null as "skip annotation, the
 * row is still useful."
 */
export async function annotateLead({
  prompt,
  resolvedFilters,
  contradictions,
  lead,
}: AnnotateInput): Promise<string | null> {
  // Build a compact facts blob — only fields that matter to fit-judgment.
  // We deliberately omit hours / raw / socials to keep the prompt tight.
  const facts = [
    `name: ${lead.business_name}`,
    lead.category ? `category: ${lead.category}` : null,
    lead.city ? `city: ${lead.city}` : null,
    lead.rating != null ? `rating: ${lead.rating}` : null,
    lead.review_count != null ? `reviews: ${lead.review_count}` : null,
    lead.website ? `website: yes` : `website: no`,
    lead.emails?.length ? `emails: ${lead.emails.length}` : null,
    lead.phones?.length ? `phone: yes` : null,
    lead.description ? `desc: ${lead.description.slice(0, 100)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const filtersBlock = describeFilters(resolvedFilters, contradictions);

  try {
    const res = await anthropic().messages.create({
      model: MODELS.haiku,
      max_tokens: 80,
      // Cache the system prompt — every lead in a search reuses it, and
      // the user's prompt is small enough that the per-call delta is
      // just the lead facts.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `User prompt (verbatim — for tone/topic only):\n${prompt}\n\nResolved filters (what actually gated this lead):\n${filtersBlock}\n\nLead facts:\n${facts}`,
        },
      ],
    });
    const block = res.content[0];
    if (block?.type !== "text") return null;
    // Cap at 100 chars — Haiku usually respects the 90c limit but we
    // hard-trim as a safety net.
    return block.text.trim().slice(0, 100);
  } catch {
    return null;
  }
}

/**
 * Batched annotator — fans out to `annotateLead` in parallel, max
 * `concurrency` at a time. Returns a map of dedupe_key → summary.
 *
 * Used by the poll route to label all newly-inserted leads in one
 * pass before responding.
 */
export async function annotateLeadsBatch(
  prompt: string,
  leads: Array<Pick<NormalizedLead, "dedupe_key"> & AnnotateInput["lead"]>,
  options: {
    resolvedFilters?: PostFilters | null;
    contradictions?: PostFilterContradiction[];
    concurrency?: number;
  } = {},
): Promise<Map<string, string>> {
  const concurrency = options.concurrency ?? 5;
  const out = new Map<string, string>();
  // Simple work-pool: chunk into batches of `concurrency` and Promise.all
  // each chunk. Keeps memory bounded if a search produces many leads.
  for (let i = 0; i < leads.length; i += concurrency) {
    const chunk = leads.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((lead) =>
        annotateLead({
          prompt,
          resolvedFilters: options.resolvedFilters,
          contradictions: options.contradictions,
          lead,
        }),
      ),
    );
    chunk.forEach((lead, idx) => {
      const summary = results[idx];
      if (summary) out.set(lead.dedupe_key, summary);
    });
  }
  return out;
}
