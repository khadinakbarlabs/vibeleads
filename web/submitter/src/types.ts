/**
 * Shared contract for the in-house contact-form submission engine.
 *
 * The terminal `SubmissionReceipt` is intentionally shaped to line up with
 * the VibeLeads app's existing `RawSubmissionRow` (see
 * lib/normalize/contact-form-submit.ts) so wiring the engine into the app
 * later is a thin field-rename, not a re-model.
 */

export interface SenderIdentity {
  name: string;
  /**
   * Email used to satisfy a form's required email field. Upstream this
   * SHOULD be a dedicated outreach sub-address (e.g. outreach+camp@domain),
   * never the user's primary inbox — isolates spam blowback.
   */
  email: string;
  phone?: string;
  company?: string;
  website?: string;
}

export interface SubmissionInput {
  url: string;
  businessName?: string;
  sender: SenderIdentity;
  /** Personalized message body. The real reply contact is embedded here. */
  message: string;
  subject?: string;
  /**
   * Embed sender contact lines (name/phone/website/email) into the message
   * body so they survive even if structured fields misroute, AND so the
   * email is prose (harder to auto-harvest) rather than a labelled field.
   * Default true.
   */
  embedContactInMessage?: boolean;
  /** Max fill→submit→verify attempts before giving up. Default 4. */
  maxAttempts?: number;
  /** Capture and persist a proof screenshot only after verified success. */
  takeScreenshots?: boolean;
  /** App-owned scope for a private post-success proof upload. Omit for local
   * CLI/eval runs, which intentionally never create durable proof files. */
  proof?: {
    accountId: string;
    searchId: string;
  };
  /** Run headless. Default true; CLI can flip for debugging. */
  headless?: boolean;
}

export type SubmissionStatus =
  | "success" // verified submission (success signal observed)
  | "submitted_unverified" // submitted, no confirmation signal seen
  | "mailto_fallback" // no form; extracted a mailto: address instead
  | "no_channel" // no form, no chatbot, no email on the page
  | "captcha_blocked" // a CAPTCHA gate we could not clear
  | "failed"; // ran out of attempts

export type FillStrategy = "dom" | "ai_map" | "vision";

/** Field kinds we serialize from the page for the AI planner. */
export interface FieldDescriptor {
  /** Stable handle we stamp onto the element (`data-sf-ref`). */
  ref: string;
  tag: "input" | "textarea" | "select";
  /** input type, or "select"/"textarea" for those tags. */
  type: string;
  name: string | null;
  id: string | null;
  /** Best-effort resolved visible label text. */
  label: string | null;
  placeholder: string | null;
  required: boolean;
  /** For select / radio groups. */
  options: string[];
  /** True when the field is hidden — a honeypot signal. Never filled. */
  honeypot: boolean;
}

export interface FormSnapshot {
  /** Ref of the <form> we're targeting, if any. */
  formRef: string | null;
  fields: FieldDescriptor[];
  /** Refs of candidate final-submit controls (send/submit/finish). */
  submitRefs: string[];
  /** Refs of step-advance controls (next/continue) on a multi-step form. */
  nextRefs: string[];
}

/** A single act→observe→reason→act pass, persisted for audit. */
export interface AttemptTrace {
  attempt: number;
  strategy: FillStrategy;
  filledRefs: string[];
  skippedHoneypots: string[];
  aiFilledRefs: string[];
  verified: boolean;
  note: string;
  screenshotPath: string | null;
}

export interface SubmissionReceipt {
  url: string;
  business_name: string | null;
  submission_status: SubmissionStatus;
  form_found: boolean;
  form_submitted: boolean;
  fields_filled: string[];
  ai_generated_fields: string[];
  mailto: string | null;
  attempts: AttemptTrace[];
  error_message: string | null;
  screenshot_url: string | null;
  /** Non-terminal diagnostic when an opted-in verified proof could not be
   * persisted. The form submission itself remains successful. */
  proof_error?: string | null;
  scraped_at: string;
}

/** ref → value the planner wants typed/selected into the form. */
export type FillPlan = Record<string, string>;
