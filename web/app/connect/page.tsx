import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/workspace/Brand";
import { WorkspacePreview } from "@/components/workspace/WorkspacePreview";
import { AgentSetup } from "@/components/workspace/AgentSetup";
import { workspaceAccount } from "@/lib/workspace/auth";

export const metadata: Metadata = {
  title: "Connect your AI agent",
  description:
    "Set up the VibeLeads remote MCP connector in your AI agent and review the results in your dashboard.",
};

const notices: Record<string, string> = {
  signin: "Sign in with Apify to open your dashboard.",
  expired: "Your Apify session expired. Sign in again to continue.",
  cancelled: "Apify sign-in was cancelled. You can try again at any time.",
  failed: "We couldn’t finish Apify sign-in. Try again from this page.",
  unavailable:
    "Apify sign-in is unavailable right now. You can still connect through your AI agent.",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const account = await workspaceAccount();
  const notice =
    status && Object.hasOwn(notices, status) ? notices[status] : null;

  if (!account && (status === "signin" || status === "expired"))
    return (
      <div className="vl-site">
        <header className="vl-public-header vl-wrap">
          <Brand />
          <Link href="/connect" className="vl-text-link">
            Connect an AI agent
          </Link>
        </header>
        <main className="vl-wrap vl-hero rd-hero">
          <div className="vl-hero-content">
            <h1>
              Your workflow <span>dashboard.</span>
            </h1>
            <p>
              {status === "expired"
                ? "Your session expired. Sign in again to see your results."
                : "Sign in with the Apify account you use in your AI agent to see your workflow history and lead results."}
            </p>
            <a href="/auth/apify/start" className="vl-button vl-primary">
              Sign in with Apify
            </a>
          </div>
          <WorkspacePreview />
        </main>
      </div>
    );
  return (
    <div className="vl-site vl-marketing">
      <header className="vl-public-header vl-wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/#workflows">Workflows</Link>
        </nav>
        <Link href="/workspace" className="vl-button vl-secondary">
          Dashboard
        </Link>
      </header>
      <main className="vl-connect vl-wrap">
        <header className="vl-page-heading">
          <h1>Connect VibeLeads to your AI agent</h1>
          <p>Use VibeLeads in any agent that supports remote MCP with OAuth.</p>
        </header>
        {notice && (
          <p className="vl-alert" role="status">
            {notice}
          </p>
        )}
        <div className="vl-connect-grid">
          <AgentSetup />
          <section className="vl-panel vl-connect-card">
            <span className="vl-icon">
              <ShieldCheck size={23} aria-hidden />
            </span>
            <h2>Open your dashboard</h2>
            <p>
              Sign in with the Apify account your AI agent uses. Review run
              history, browse datasets and download results.
            </p>
            <a
              href={account ? "/workspace" : "/auth/apify/start"}
              className="vl-button vl-primary"
            >
              {account ? "Open dashboard" : "Sign in with Apify"}
            </a>
            <p className="vl-small">
              Apify asks you to approve API access. The dashboard uses it to
              read your VibeLeads runs and result data.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
