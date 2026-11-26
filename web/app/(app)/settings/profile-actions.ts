"use server";

/**
 * Settings → Sender profile save action.
 *
 * Lets users create/edit the reusable business profile without launching
 * a campaign. Same validation rules as the campaign wizard (email format,
 * phone with country code, website URL with auto-https) so the two entry
 * points can't drift.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertBusinessProfile } from "@/lib/profile/queries";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

const ProfileSchema = z.object({
  senderName: z.string().trim().min(2, "Enter your full name").max(80),
  senderEmail: z.string().trim().email("Enter a valid email address"),
  senderPhone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z
      .string()
      .min(7, "Enter a valid phone number (include country code)")
      .max(40)
      .regex(
        /^[+()\d\s-]+$/,
        "Phone may only contain digits, +, -, (), and spaces",
      ),
  ),
  company: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "Company is required").max(80),
  ),
  website: z.preprocess((v) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
  }, z.string().url("Enter a valid website URL")),
  linkedin: z.preprocess((v) => {
    const t = typeof v === "string" ? v.trim() : "";
    if (!t) return null;
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }, z.string().url("Enter a valid LinkedIn URL").nullable()),
  defaultPitch: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().max(280).nullable(),
  ),
});

export async function saveBusinessProfile(
  _prev: SaveProfileResult | null,
  formData: FormData,
): Promise<SaveProfileResult> {
  const parsed = ProfileSchema.safeParse({
    senderName: formData.get("senderName"),
    senderEmail: formData.get("senderEmail"),
    senderPhone: formData.get("senderPhone"),
    company: formData.get("company"),
    website: formData.get("website"),
    linkedin: formData.get("linkedin"),
    defaultPitch: formData.get("defaultPitch"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await upsertBusinessProfile(parsed.data);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save profile",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/outreach/new");
  return { ok: true };
}
