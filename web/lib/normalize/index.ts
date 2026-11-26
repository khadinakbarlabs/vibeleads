/**
 * Dispatcher: pick the right normalizer per intent. Returns ZERO OR MORE
 * NormalizedLeads per actor row. Only the contact-form-submit pipeline is
 * active — every other intent is no longer routed.
 */
import type { Intent } from "@/lib/apify/actors";
import type { NormalizedLead } from "./types";
import { normalizeContactFormSubmit } from "./contact-form-submit";

export function normalizeRow(intent: Intent, raw: unknown): NormalizedLead[] {
  if (!raw || typeof raw !== "object") return [];
  const row = raw as Record<string, unknown>;

  switch (intent) {
    case "contact_form_submit": {
      const lead = normalizeContactFormSubmit(row);
      return lead ? [lead] : [];
    }
    default:
      return [];
  }
}

export type { NormalizedLead } from "./types";
