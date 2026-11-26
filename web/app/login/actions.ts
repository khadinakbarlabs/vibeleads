"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/server";
import { publicEnv } from "@/lib/env";

const EmailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type LoginActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function getRedirectOrigin(): Promise<string> {
  // Prefer the request's forwarded host so the magic-link callback returns
  // the user to the same origin they signed in from (Vercel preview URLs,
  // localhost, prod — all handled). Fall back to the configured site URL
  // for environments where headers aren't available (e.g. background jobs).
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() can throw outside a request context — fall through
  }
  return publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function sendMagicLink(
  _prev: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const parsed = EmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email",
    };
  }

  const supabase = await createServerSupabase();
  const origin = await getRedirectOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: `Magic link sent to ${parsed.data.email}. Check your inbox.`,
  };
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createServerSupabase();
  const origin = await getRedirectOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? "Failed to start Google sign-in");
  }

  redirect(data.url);
}
