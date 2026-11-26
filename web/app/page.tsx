import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/workspace/Brand";
import { workspaceAccount } from "@/lib/workspace/auth";
import { AgentSetup } from "@/components/workspace/AgentSetup";
import "./landing.css";

export default async function Home() {
  const account = await workspaceAccount();
  return (
    <div className="vl-site buyer-home">
      <a className="lp-skip" href="#main-content">
        Skip to content
      </a>
      <header className="lp-header lp-wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#connect">Setup</a>
          <Link href="/workspace">My results</Link>
          <a
            href="https://github.com/khadinakbarlabs/vibeleads"
            aria-label="VibeLeads on GitHub"
          >
            GitHub ↗
          </a>
        </nav>
      </header>
      <main id="main-content">
        <section className="buyer-hero lp-wrap">
          <div>
            <h1>Find the businesses that need what you sell.</h1>
            <p>
              Describe your ideal customer in your AI assistant. VibeLeads finds
              prospects, checks buying signals, enriches contact details and
              scores the fit.
            </p>
            <div className="buyer-actions">
              <a
                className="lp-button lp-button-dark"
                href={account ? "/workspace" : "/auth/apify/start"}
              >
                {account ? "Open my results" : "Sign in with Apify"}{" "}
                <ArrowUpRight size={17} aria-hidden />
              </a>
              <a className="vl-text-link" href="#connect">
                Connect my assistant ↓
              </a>
            </div>
          </div>
          <aside className="sample-brief">
            <span>Example prospecting brief</span>
            <blockquote>
              “I build websites for dental practices. Find dentists in Austin
              whose sites are slow on mobile.”
            </blockquote>
            <p>
              Review the plan and price before approving a search. Open the
              saved prospects in your dashboard.
            </p>
          </aside>
        </section>
        <section id="connect" className="buyer-connect lp-wrap">
          <h2>Set up VibeLeads</h2>
          <p>
            Choose one connection method. Sign in to the dashboard with the same
            Apify account you use in your assistant.
          </p>
          <AgentSetup />
        </section>
        <details className="lp-wrap buyer-compare">
          <summary>How does VibeLeads compare?</summary>
          <p>
            Use the MIT-licensed connector and playbooks with hosted Apify tools
            for list building and contact enrichment, workflows also offered by
            Apollo and Clay. GojiBerry overlaps on signal-based prospecting.
            Xply describes social feedback workflows. VibeLeads focuses on
            finding and qualifying prospects for your offer.
          </p>
        </details>
      </main>
      <footer className="lp-footer lp-wrap">
        <Brand />
        <nav aria-label="Footer navigation">
          <a href="https://github.com/khadinakbarlabs/vibeleads">
            Open-source connector
          </a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
