/**
 * Enrichment orchestrator. Runs after a search's leads have been
 * normalized — for each lead:
 *
 *   1. Normalize phones (sync, free)
 *   2. Validate emails (paid, async, optional per-search)
 *   3. Discover social profiles from website (free, async, optional per-search)
 *
 * Caps the inline pass at ENRICH_INLINE_BUDGET leads so a single webhook
 * invocation stays under Vercel's max-duration. Anything above the cap is
 * left in `enrichment_state = 'pending'` for the cron sweep to pick up.
 *
 * All updates use the admin client — the webhook handler runs without a
 * user session.
 */
import "server-only";
import { adminSupabase } from "@/lib/db/admin";
import { grantCreditsAdmin } from "@/lib/billing/credits";
import { emitProgress } from "@/lib/searches/progress";
import { normalizePhones } from "./phone-normalizer";
import { validateLeadEmails } from "./email-validator";
import { discoverSocials, type SocialMap } from "./social-discovery";
import { scorePageSpeed } from "./pagespeed";
import type { Tables } from "@/lib/db/types";

type Lead = Tables<"leads">;

export const ENRICH_INLINE_BUDGET = 50;

interface EnrichOptions {
  searchId: string;
  accountId: string;
  enrichEmail: boolean;
  enrichSocials: boolean;
}

export interface EnrichSummary {
  attempted: number;
  enriched: number;
  emailsValidated: number;
  socialsFound: number;
  creditsCharged: number;
  errors: number;
}

/** Run enrichment for up to ENRICH_INLINE_BUDGET pending leads in a search. */
export async function enrichSearchLeads(
  opts: EnrichOptions,
): Promise<EnrichSummary> {
  const supabase = adminSupabase();

  await supabase
    .from("searches")
    .update({ status: "enriching" })
    .eq("id", opts.searchId);

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("search_id", opts.searchId)
    .eq("enrichment_state", "pending")
    .limit(ENRICH_INLINE_BUDGET);

  const summary: EnrichSummary = {
    attempted: leads?.length ?? 0,
    enriched: 0,
    emailsValidated: 0,
    socialsFound: 0,
    creditsCharged: 0,
    errors: 0,
  };

  if (!leads || leads.length === 0) {
    await supabase
      .from("searches")
      .update({ status: "completed" })
      .eq("id", opts.searchId);
    return summary;
  }

  // Mark in-progress so concurrent invocations don't double-enrich.
  await supabase
    .from("leads")
    .update({ enrichment_state: "running" })
    .in(
      "id",
      leads.map((l) => l.id),
    );

  // Process in modest concurrency. Phone normalization is sync; email +
  // social are I/O-bound — Promise.allSettled keeps a single failure from
  // halting the rest.
  const results = await Promise.allSettled(
    leads.map((lead) => enrichOneLead(lead, opts)),
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      summary.enriched++;
      summary.emailsValidated += r.value.emailsValidated;
      summary.socialsFound += r.value.socialsFound;
      summary.creditsCharged += r.value.creditsCharged;
    } else {
      summary.errors++;
    }
  }

  // Stream enrichment counts into the live progress overlay so the UI
  // animates the per-step counters instead of jumping at the end.
  await emitProgress(opts.searchId, {
    enriched_phones: leads.length, // phone normalize runs for every lead
    enriched_emails: summary.emailsValidated,
    enriched_socials: summary.socialsFound,
    step: `Enriched ${summary.enriched} of ${leads.length} leads — ${summary.emailsValidated} emails validated, ${summary.socialsFound} socials found.`,
    log: `Enrichment ran ${summary.enriched}/${leads.length} (errors: ${summary.errors})`,
  });

  // Finalize search status if no more pending leads remain.
  const { count: remaining } = await supabase
    .from("leads")
    .select("id", { head: true, count: "exact" })
    .eq("search_id", opts.searchId)
    .eq("enrichment_state", "pending");

  await supabase
    .from("searches")
    .update({
      status: (remaining ?? 0) > 0 ? "enriching" : "completed",
    })
    .eq("id", opts.searchId);

  return summary;
}

interface SingleResult {
  emailsValidated: number;
  socialsFound: number;
  creditsCharged: number;
  creditsRefunded: number;
}

interface EnrichmentMeta {
  phone?: {
    source: "libphonenumber";
    e164_count: number;
    original_count: number;
  };
  email?: { provider: string; raw_status: string; results_count: number };
  socials?: { source: "homepage_scrape"; found: string[] };
  pagespeed?: {
    source: "google_psi";
    score: number;
    lcp_ms: number | null;
    fcp_ms: number | null;
    raw_status: string;
  };
  refunds?: Array<{ reason: string; amount: number }>;
}

async function enrichOneLead(
  lead: Lead,
  opts: EnrichOptions,
): Promise<SingleResult> {
  const supabase = adminSupabase();
  const result: SingleResult = {
    emailsValidated: 0,
    socialsFound: 0,
    creditsCharged: 0,
    creditsRefunded: 0,
  };
  const meta: EnrichmentMeta = {};
  const refunds: Array<{ reason: string; amount: number }> = [];

  // 1. Phone normalization — sync, free.
  const phoneSummary = normalizePhones(lead.phones);
  const normalizedPhones =
    phoneSummary.e164.length > 0 ? phoneSummary.e164 : lead.phones;
  const phoneStatus =
    phoneSummary.status === "valid"
      ? "valid"
      : phoneSummary.status === "invalid"
        ? "invalid"
        : "unknown";
  meta.phone = {
    source: "libphonenumber",
    e164_count: phoneSummary.e164.length,
    original_count: phoneSummary.input.length,
  };

  // 2. Email validation — async, optional. Refunds the credit if the
  // call failed (network error, provider unreachable) so users don't
  // pay for lookups that didn't actually validate anything.
  let emailStatus: Lead["email_status"] = "skipped";
  if (opts.enrichEmail && lead.emails.length > 0) {
    try {
      const { aggregate, results } = await validateLeadEmails(lead.emails);
      emailStatus = aggregate;
      result.emailsValidated = results.length;
      const provider = results[0]?.provider ?? "syntax_only";
      const rawStatus = results[0]?.rawStatus ?? "unknown";
      meta.email = {
        provider,
        raw_status: rawStatus,
        results_count: results.length,
      };

      // Refund per-email when the provider returned 'unknown' due to
      // network or HTTP error — we charged but got no signal.
      const networkErrorCount = results.filter(
        (r) =>
          r.rawStatus === "network_error" || r.rawStatus?.startsWith("http_"),
      ).length;
      if (networkErrorCount > 0) {
        refunds.push({
          reason: "email_validate_network_error",
          amount: networkErrorCount,
        });
        result.creditsRefunded += networkErrorCount;
      }
    } catch {
      emailStatus = "unknown";
      // Whole call failed → refund the email validation credits we'd have charged.
      const refundAmount = lead.emails.length;
      refunds.push({
        reason: "email_validate_exception",
        amount: refundAmount,
      });
      result.creditsRefunded += refundAmount;
    }
  }

  // 3. Social discovery — async, optional, requires a website.
  let socials: SocialMap = (lead.socials as SocialMap | null) ?? {};
  if (opts.enrichSocials && lead.website) {
    try {
      const discovered = await discoverSocials(lead.website);
      socials = { ...socials, ...discovered };
      result.socialsFound = Object.keys(discovered).length;
      if (result.socialsFound > 0) {
        meta.socials = {
          source: "homepage_scrape",
          found: Object.keys(discovered),
        };
      } else {
        // Refund the social-discovery credit since we got nothing.
        refunds.push({ reason: "socials_no_results", amount: 1 });
        result.creditsRefunded += 1;
      }
    } catch {
      // Network failure — refund.
      refunds.push({ reason: "socials_network_error", amount: 1 });
      result.creditsRefunded += 1;
    }
  }

  // 4. PageSpeed enrichment — free, only runs when PAGESPEED_API_KEY is
  // configured AND the lead has a website. We don't refund on failure
  // because there's no charge — the step is silently skipped on errors.
  let pagespeedScore: number | null = null;
  let pagespeedLcpMs: number | null = null;
  let pagespeedFcpMs: number | null = null;
  if (lead.website) {
    const psi = await scorePageSpeed(lead.website);
    if (psi && psi.rawStatus === "ok") {
      pagespeedScore = psi.score;
      pagespeedLcpMs = psi.lcpMs;
      pagespeedFcpMs = psi.fcpMs;
      meta.pagespeed = {
        source: "google_psi",
        score: psi.score,
        lcp_ms: psi.lcpMs,
        fcp_ms: psi.fcpMs,
        raw_status: psi.rawStatus,
      };
    }
  }

  if (refunds.length > 0) {
    meta.refunds = refunds;
    try {
      await grantCreditsAdmin({
        accountId: opts.accountId,
        amount: refunds.reduce((s, r) => s + r.amount, 0),
        reason: "refund",
        refKind: "lead",
        refId: lead.id,
        metadata: { refunds },
      });
    } catch {
      // Ledger insert failed — soft fail; persist meta anyway.
    }
  }

  // Persist enriched state with provenance.
  await supabase
    .from("leads")
    .update({
      phones: normalizedPhones,
      phone_status: phoneStatus,
      email_status: emailStatus,
      socials: socials as never,
      pagespeed_score: pagespeedScore,
      pagespeed_lcp_ms: pagespeedLcpMs,
      pagespeed_fcp_ms: pagespeedFcpMs,
      enrichment_state: "done",
      enrichment_meta: meta as never,
    })
    .eq("id", lead.id);

  return result;
}
