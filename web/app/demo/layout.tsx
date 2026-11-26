import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Send, ArrowLeft } from "lucide-react";
import { MobileNav } from "@/components/app/MobileNav";
import { SidebarNav } from "@/components/app/SidebarNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoMark } from "@/components/brand/LogoMark";

/**
 * Per-segment metadata defaults. Every nested demo page inherits a sensible
 * page-specific title via the template, instead of falling back to the
 * root-layout default ("VibeLeads — Type a prompt…") which was leaking
 * into browser tabs + search results for /demo/dashboard, /demo/search/...,
 * etc. Individual pages can still override by exporting their own metadata.
 */
export const metadata: Metadata = {
  // `absolute` on the default and a passthrough template (`%s` only)
  // prevents the root layout's "%s — VibeLeads" from double-templating
  // child titles into "X — Demo — VibeLeads — VibeLeads".
  title: {
    absolute: "Demo — VibeLeads",
    template: "%s — Demo — VibeLeads",
  },
  description:
    "Interactive demo of VibeLeads contact-form outreach — watch a campaign discover contact pages, fill them with Claude, and submit. Click around without signing up.",
  robots: { index: false, follow: true },
};

const navItems: Array<{ href: string; label: string; icon: React.ReactNode }> =
  [
    {
      href: "/demo",
      label: "Demo home",
      icon: <LayoutGrid className="h-4 w-4" />,
    },
    {
      href: "/demo/outreach",
      label: "Outreach",
      icon: <Send className="h-4 w-4" />,
    },
  ];

const DEMO_BALANCE = 2450;

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-bg-alt)] lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-6 text-base font-semibold tracking-tight">
          <LogoMark size={28} />
          VibeLeads
        </div>
        <nav className="flex-1 px-3 py-4">
          <SidebarNav items={navItems} />
        </nav>
        <div className="border-t border-[var(--color-border)] px-6 py-4 text-xs text-[var(--color-fg-subtle)]">
          <p className="truncate">demo@vibeleads.app</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1 text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to landing
          </Link>
        </div>
      </aside>

      {/*
        `min-w-0` is required on the grid item — without it CSS Grid
        defaults to `min-width: auto`, which lets a wide table inside
        the LeadsTable expand the whole `1fr` column past the viewport.
        See the matching note in app/(app)/layout.tsx.
      */}
      <div className="flex min-h-screen min-w-0 flex-col">
        <MobileNav
          items={navItems}
          workspaceLabel="VibeLeads · Demo"
          footer={
            <>
              <p className="truncate">demo@vibeleads.app</p>
              <Link
                href="/"
                className="mt-2 inline-flex items-center gap-1 text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-fg)] hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to landing
              </Link>
            </>
          }
        />
        <header className="hidden h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 lg:flex sm:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
              demo
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
              Workspace
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="font-mono">{DEMO_BALANCE.toLocaleString()}</span>
              <span className="text-[var(--color-fg-muted)]">credits</span>
            </span>
          </div>
        </header>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 lg:hidden">
          <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)]">
            demo
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            <span className="font-mono">{DEMO_BALANCE.toLocaleString()}</span>
            <span className="text-[var(--color-fg-muted)]">credits</span>
          </span>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
