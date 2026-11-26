"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/brand/LogoMark";
import {
  sendMagicLink,
  signInWithGoogle,
  type LoginActionResult,
} from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<
    LoginActionResult | null,
    FormData
  >(sendMagicLink, null);

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — form */}
      <section className="flex flex-col px-6 py-10 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <LogoMark size={28} />
          VibeLeads
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <h1 className="text-balance font-semibold leading-tight tracking-[-0.03em] text-[length:var(--text-h1)]">
            Sign in to VibeLeads
          </h1>
          <p className="mt-3 text-[var(--color-fg-muted)]">
            Magic link or Google. No passwords to remember.
          </p>

          <form action={signInWithGoogle} className="mt-10">
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            or
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <form action={formAction} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium">
              Work email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.example"
              disabled={pending}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Sending…" : "Send magic link"}
              {!pending && <ArrowUpRight className="h-4 w-4" />}
            </Button>
          </form>

          {state && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${
                state.ok
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-fg)]"
                  : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-[var(--color-fg)]"
              }`}
            >
              {state.ok ? state.message : state.error}
            </p>
          )}

          <p className="mt-10 text-xs text-[var(--color-fg-subtle)]">
            By signing in you agree to the{" "}
            <Link href="/terms" className="underline-offset-4 hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline-offset-4 hover:underline"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>

        <p className="text-sm text-[var(--color-fg-subtle)]">
          New here?{" "}
          <span className="text-[var(--color-fg)]">
            Just enter your email — your account is created on first sign-in.
          </span>
        </p>
      </section>

      {/* Right — accent panel */}
      <aside className="relative hidden overflow-hidden bg-[var(--color-bg-alt)] lg:block">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_25%_15%,oklch(56%_0.22_274_/_0.18),transparent_55%),radial-gradient(circle_at_85%_85%,oklch(72%_0.16_180_/_0.12),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-fg-subtle)]">
            What you&apos;ll do
          </p>
          <div className="space-y-6">
            <p className="text-balance text-2xl font-medium tracking-[-0.01em] text-[var(--color-fg)] sm:text-3xl">
              &ldquo;Reach every dental practice in Austin through their own
              contact form — no cold email, no warm-up.&rdquo;
            </p>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-[var(--color-border)] p-px">
              <MiniStat label="Found" value="86" />
              <MiniStat label="Delivered" value="71" />
              <MiniStat label="Blocked" value="12" />
            </div>
            <p className="text-sm text-[var(--color-fg-muted)]">
              VibeLeads finds each business, writes a tailored message, and
              submits it through their contact form — usually within two
              minutes.
            </p>
          </div>
          <p className="font-mono text-xs text-[var(--color-fg-subtle)]">
            ▍ Cold outreach, minus the cold email
          </p>
        </div>
      </aside>
    </main>
  );
}

function MiniStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
        {label}
      </p>
      <p
        className={`mt-1 text-base tracking-tight ${
          mono ? "font-mono text-[13px]" : "font-medium text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.67-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
