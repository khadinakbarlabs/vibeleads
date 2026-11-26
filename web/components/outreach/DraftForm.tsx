"use client";

import { useActionState } from "react";
import {
  draftOutreachMessage,
  type DraftMessageResult,
} from "@/app/(app)/outreach/new/actions";

export function DraftForm() {
  const [draft, submit, pending] = useActionState<
    DraftMessageResult | null,
    FormData
  >(
    async (_previous, fields) =>
      draftOutreachMessage({
        businessType: String(fields.get("businessType") ?? ""),
        pitch: String(fields.get("pitch") ?? ""),
      }),
    null,
  );
  return (
    <form action={submit} className="grid gap-4">
      <label>
        Who do you sell to?
        <input
          name="businessType"
          required
          minLength={2}
          maxLength={200}
          className="block w-full rounded border p-2"
        />
      </label>
      <label>
        What do you offer?
        <textarea
          name="pitch"
          required
          maxLength={2000}
          className="block w-full rounded border p-2"
        />
      </label>
      <button disabled={pending} className="rounded border p-2">
        {pending ? "Drafting…" : "Generate draft"}
      </button>
      {draft &&
        (draft.ok ? (
          <section aria-live="polite">
            <h2>{draft.subject}</h2>
            <p className="whitespace-pre-line">{draft.message}</p>
          </section>
        ) : (
          <p role="alert">{draft.error}</p>
        ))}
    </form>
  );
}
