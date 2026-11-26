import Link from "next/link";
import { Brand } from "@/components/workspace/Brand";
import { AgentSetup } from "@/components/workspace/AgentSetup";
import { workspaceAccount } from "@/lib/workspace/auth";
import "../landing.css";
export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams,
    account = await workspaceAccount();
  const notices: Record<string, string> = {
    signin:
      "Sign in with the account you use in your assistant to open your saved results.",
    expired: "Your session has expired. Sign in again to open your results.",
    unavailable: "Apify sign-in is temporarily unavailable. Try again shortly.",
    cancelled: "Authorization was not completed. You can try again.",
    failed: "Sign-in did not complete. Please try again.",
  };
  return (
    <div className="vl-site buyer-home">
      <header className="lp-header lp-wrap">
        <Brand />
        <Link href="/workspace">My results</Link>
      </header>
      <main className="lp-wrap buyer-connect">
        <h1>Connect VibeLeads</h1>
        {status && Object.hasOwn(notices, status) && (
          <p role="status">{notices[status]}</p>
        )}
        <p>
          Use the same Apify account in your assistant and dashboard. Your
          assistant may open a separate authorization window.
        </p>
        <a
          className="lp-button lp-button-dark"
          href={account ? "/workspace" : "/auth/apify/start"}
        >
          {account ? "Open my results" : "Sign in with Apify"}
        </a>
        <AgentSetup />
      </main>
    </div>
  );
}
