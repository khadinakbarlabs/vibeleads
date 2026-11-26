import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, Layers, LogOut, LayoutDashboard } from "lucide-react";
import { Brand } from "./Brand";

export function WorkspaceShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <main className="vl-site vl-dashboard">
      <aside className="vl-sidebar">
        <Brand />
        <nav aria-label="Workspace navigation">
          <Link href="/workspace">
            <LayoutDashboard size={20} aria-hidden /> Overview
          </Link>
          <Link href="/workspace#runs-heading">
            <Clock size={20} aria-hidden /> Workflow history
          </Link>

          <Link href="/connect">
            <Layers size={20} aria-hidden /> Connect an agent
          </Link>
        </nav>
        <div className="vl-account">
          <span>Apify account</span>
          <strong>{name}</strong>
          <form action="/auth/apify/sign-out" method="post">
            <button type="submit">
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="vl-dashboard-body">{children}</div>
    </main>
  );
}
