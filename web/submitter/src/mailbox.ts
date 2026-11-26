/**
 * Outreach sub-address composer.
 *
 * Convention: every submission sets the form's required email field to
 * `<base>+camp<campaignId>@<outreachDomain>` (or `<base>+camp<id>-<rcpt>`
 * when a per-recipient tag is supplied). RFC 5233 sub-addressing routes
 * every variant back to the single base inbox — so we get:
 *   - per-campaign filtering / unsubscribe handling
 *   - blowback isolation (a spam-flagged variant doesn't poison the base)
 *   - the user's real reply email is never in a structured field
 *
 * The real reply contact lives in the message body (see plan.ts /
 * buildMessageBody) so recipients can still reach the user directly.
 *
 * Configure once in env:
 *   OUTREACH_INBOX_BASE   = outreach            (default)
 *   OUTREACH_INBOX_DOMAIN = your-domain.com     (required to opt in)
 *
 * Without OUTREACH_INBOX_DOMAIN we fall back to the sender's own email
 * (the legacy behaviour), and the caller is informed via the `synthetic`
 * flag so the campaign UI can flag the deliverability risk.
 */

export interface SubAddressInput {
  /** The user's real reply email (the legacy fallback). */
  senderEmail: string;
  /** Stable per-campaign identifier (e.g. searches.id). */
  campaignId: string;
  /** Optional per-recipient tag (e.g. lead dedupe_key suffix). */
  recipientTag?: string;
}

export interface OutreachAddress {
  /** Address to put in the form's email field. */
  email: string;
  /** True when a real sub-address was minted; false = sender fallback. */
  synthetic: boolean;
  /** Routes-to inbox so we know where bounces / replies land. */
  routesTo: string;
}

const ID_SAFE = /[^a-z0-9-]/gi;

function safe(token: string): string {
  return token.toLowerCase().replace(ID_SAFE, "").slice(0, 24);
}

export function outreachAddress(input: SubAddressInput): OutreachAddress {
  const base = (process.env.OUTREACH_INBOX_BASE ?? "outreach").trim();
  const domain = process.env.OUTREACH_INBOX_DOMAIN?.trim();

  if (!domain) {
    return {
      email: input.senderEmail,
      synthetic: false,
      routesTo: input.senderEmail,
    };
  }

  const campaign = safe(input.campaignId) || "cmp";
  const tag = input.recipientTag ? `-${safe(input.recipientTag)}` : "";
  const local = `${base}+camp${campaign}${tag}`;
  return {
    email: `${local}@${domain}`,
    synthetic: true,
    routesTo: `${base}@${domain}`,
  };
}
