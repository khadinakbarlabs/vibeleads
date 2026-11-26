import { LayoutDashboard, Send, Settings, Wallet } from "lucide-react";
import { requireAccount } from "@/lib/auth/server";
import { createServerSupabase } from "@/lib/db/server";
import { MobileNav } from "@/components/app/MobileNav";
import { SidebarNav } from "@/components/app/SidebarNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoMark } from "@/components/brand/LogoMark";
import { LiveCounter } from "@/components/motion/LiveCounter";

const navItems: Array<{ href: string; label: string; icon: React.ReactNode }> =
  [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/outreach",
      label: "Outreach",
      icon: <Send className="h-4 w-4" />,
    },
    {
      href: "/billing",
      label: "Billing",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, accountId } = await requireAccount();

  // Pull credit balance for the header chip. View is RLS-scoped via
  // is_account_member, so the request runs safely as the user.
  const supabase = await createServerSupabase();
  const { data: balanceRow } = await supabase
    .from("account_credit_balance")
    .select("balance")
    .eq("account_id", accountId)
    .maybeSingle();

  const balance = (balanceRow?.balance as number | null) ?? 0;

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
          <p className="truncate" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action="/auth/sign-out" method="post" className="mt-2">
            <button
              type="submit"
              className="text-[var(--color-fg-muted)] underline-offset-4 transition-colors hover:text-[var(--color-fg)] hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/*
        `min-w-0` is required on the grid item — without it CSS Grid
        defaults to `min-width: auto`, which lets a wide table inside
        the LeadsTable expand the whole `1fr` column past the viewport
        (page scrollbar appears, headline gets clipped). With min-w-0
        the column stays at its track width and the table itself
        scrolls horizontally inside `overflow-x-auto`.
      */}
      <div className="flex min-h-screen min-w-0 flex-col">
        <MobileNav
          items={navItems}
          workspaceLabel="VibeLeads"
          footer={
            <>
              <p className="truncate" title={user.email ?? ""}>
                {user.email}
              </p>
              <form action="/auth/sign-out" method="post" className="mt-2">
                <button
                  type="submit"
                  className="text-[var(--color-fg-muted)] underline-offset-4 transition-colors hover:text-[var(--color-fg)] hover:underline"
                >
                  Sign out
                </button>
              </form>
            </>
          }
        />
        <header className="hidden h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 lg:flex sm:px-8">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
            Workspace
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span className="font-mono tabular-nums">
                <LiveCounter value={balance} />
              </span>
              <span className="text-[var(--color-fg-muted)]">credits</span>
            </span>
          </div>
        </header>
        {/* Mobile credits chip — sits below the mobile nav header. */}
        <div className="flex items-center justify-end border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 lg:hidden">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            <span className="font-mono tabular-nums">
              <LiveCounter value={balance} />
            </span>
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
