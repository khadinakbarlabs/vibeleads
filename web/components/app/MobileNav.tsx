"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "@/components/brand/LogoMark";

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileNavProps {
  items: MobileNavItem[];
  workspaceLabel: string;
  /** Optional bottom slot — usually email + sign-out form. */
  footer?: React.ReactNode;
}

/**
 * Mobile navigation drawer. Shows a header bar with a hamburger trigger
 * below the `lg` breakpoint (1024px); above that the desktop sidebar in
 * the layout takes over and this component renders nothing.
 *
 * A11y:
 *   - On open: focus moves to the drawer's close button so keyboard users
 *     land inside the dialog instead of leaving focus on the trigger.
 *   - On close: focus returns to the original trigger button (the
 *     hamburger) — required by WAI-ARIA dialog guidance. Without this
 *     keyboard users get stranded on <body> after Esc / close-click.
 *   - Esc closes the drawer.
 *   - aria-modal + role="dialog" already present.
 */
export function MobileNav({ items, workspaceLabel, footer }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Close on Esc + lock body scroll + move focus into the dialog on open,
  // restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    // Capture both refs at effect-entry time so cleanup closures always
    // target the exact nodes that were mounted when this effect ran.
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Defer one frame so the dialog is mounted before we focus.
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
      // Restore focus to the hamburger using the captured ref.
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 px-4 backdrop-blur-md lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <LogoMark size={28} />
          VibeLeads
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          className="grid h-9 w-9 place-items-center rounded-md text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-fg)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className={cn(
              "fixed inset-0 z-30 bg-[oklch(15%_0.02_264_/_0.32)] backdrop-blur-sm lg:hidden",
              "motion-safe:animate-[backdrop-in_240ms_var(--ease-out-expo)_both]",
            )}
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className={cn(
              "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-border-strong)] bg-[var(--color-bg-alt)]",
              "shadow-[0_24px_64px_-24px_oklch(0%_0_0_/_0.35)] lg:hidden",
              "motion-safe:animate-[drawer-in_320ms_var(--ease-out-expo)_both]",
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-5">
              <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
                <LogoMark size={28} />
                {workspaceLabel}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <ul className="space-y-0.5">
                {items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                    >
                      {it.icon}
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {footer && (
              <div className="border-t border-[var(--color-border)] px-5 py-4 text-xs text-[var(--color-fg-subtle)]">
                {footer}
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
