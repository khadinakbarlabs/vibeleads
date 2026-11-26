"use client";

/**
 * Sender profile editor for Settings.
 *
 * The reusable identity (name, email, phone, company, website, LinkedIn,
 * default pitch) that auto-prefills every campaign and fills each contact
 * form. Entered once here or captured on the first campaign launch.
 */

import { useActionState } from "react";
import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  saveBusinessProfile,
  type SaveProfileResult,
} from "@/app/(app)/settings/profile-actions";
import type { BusinessProfile } from "@/lib/profile/queries";

interface SenderProfileCardProps {
  profile: BusinessProfile | null;
}

export function SenderProfileCard({ profile }: SenderProfileCardProps) {
  const [state, formAction, pending] = useActionState<
    SaveProfileResult | null,
    FormData
  >(saveBusinessProfile, null);

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <header className="mb-1 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <UserRound className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">Sender profile</h2>
      </header>
      <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
        Entered once, then used to fill every contact form and prefill each
        campaign. Anything a form requires that you leave blank is completed
        automatically.
      </p>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField
            label="Your name"
            name="senderName"
            defaultValue={profile?.sender_name ?? ""}
            placeholder="Jane Doe"
            required
          />
          <ProfileField
            label="Your email"
            name="senderEmail"
            type="email"
            defaultValue={profile?.sender_email ?? ""}
            placeholder="jane@acme.example"
            required
          />
          <ProfileField
            label="Phone"
            name="senderPhone"
            type="tel"
            defaultValue={profile?.sender_phone ?? ""}
            placeholder="+1 555 123 4567"
            required
          />
          <ProfileField
            label="Company"
            name="company"
            defaultValue={profile?.company ?? ""}
            placeholder="Acme Co"
            required
          />
          <ProfileField
            label="Website"
            name="website"
            type="url"
            defaultValue={profile?.website ?? ""}
            placeholder="acme.com"
            required
          />
          <ProfileField
            label="LinkedIn"
            name="linkedin"
            defaultValue={profile?.linkedin ?? ""}
            placeholder="linkedin.com/in/jane"
          />
        </div>

        <label className="block">
          <span className="text-sm font-semibold tracking-tight">
            Default pitch
            <span className="ml-1 font-normal text-[var(--color-fg-subtle)]">
              (optional)
            </span>
          </span>
          <p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">
            One line on what you offer. Seeds the AI message writer on new
            campaigns.
          </p>
          <textarea
            name="defaultPitch"
            defaultValue={profile?.default_pitch ?? ""}
            rows={2}
            maxLength={280}
            placeholder="We get local clinics more 5-star Google reviews on autopilot."
            className="mt-2 block w-full resize-y rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
          />
        </label>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : profile ? (
              "Save changes"
            ) : (
              "Save profile"
            )}
          </Button>
          {state?.ok && !pending && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          {state && !state.ok && !pending && (
            <span className="text-sm text-[var(--color-danger)]">
              {state.error}
            </span>
          )}
        </div>
      </form>
    </article>
  );
}

function ProfileField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold tracking-tight">
        {label}
        {required && (
          <span
            aria-label="required"
            className="ml-1 text-[var(--color-danger)]"
          >
            *
          </span>
        )}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={cn(
          "mt-2 block h-10 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-fg)]",
          "placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none",
        )}
      />
    </label>
  );
}
