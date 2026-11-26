"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Native <dialog>-backed modal. Free Esc handling, focus trap, and backdrop
 * styling via the ::backdrop pseudo. Centered, max-width, rounded.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Close when clicking backdrop (the dialog element itself, not inside)
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0 text-[var(--color-fg)] shadow-[0_24px_64px_-24px_oklch(0%_0_0_/_0.35)] backdrop:bg-[oklch(15%_0.02_264_/_0.32)] backdrop:backdrop-blur-sm open:animate-[var(--anim-pop,_pop_140ms_var(--ease-out-expo))]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-fg-subtle)] transition-colors hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-fg)]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
