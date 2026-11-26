"use client";

/**
 * Desktop sidebar navigation list. Highlights the current route via a left
 * accent rail and a subtle bg tint. Falls back to a hover treatment for
 * non-active rows.
 *
 * Lives in components/app so the demo layout (which doesn't have a server
 * `requireAccount` wrapper) can render the same shell with `interactive=false`
 * if needed later.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname() ?? "";
  return (
    <ul className="space-y-0.5">
      {items.map((it) => {
        const active =
          pathname === it.href ||
          (it.href !== "/" && pathname.startsWith(it.href + "/")) ||
          (it.href !== "/" && pathname.startsWith(it.href));
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--color-surface)] text-[var(--color-fg)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]",
              )}
            >
              {/* Left accent rail — only visible on the active row. */}
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-[var(--color-accent)]"
                />
              )}
              {it.icon}
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
