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
          {account ? (
            <Link href="/workspace">My results</Link>
          ) : (
            <a href="/auth/apify/start">Sign in with Apify</a>
          )}
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
              Tell your AI assistant what you sell. It can look for open buyer
              requests with its included web search or quote a lead search on
              your Apify account. VibeLeads can save prospects, check buying
              signals and enrich contact details.
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
          <aside id="preview" className="sample-brief">
            <span>Example prospecting brief</span>
            <blockquote>“I am a video editor.”</blockquote>
            <p>
              The plugin suggests who could buy your work and where to find
              them. Review the price before approving a paid search.
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
        <details id="workflows" className="lp-wrap buyer-compare">
          <summary>How does VibeLeads compare?</summary>
          <p>
            The open-source parts are the MIT-licensed connector and agent
            playbooks. Use them with hosted Apify tools for list building and
            contact enrichment, workflows also offered by Apollo and Clay.
            VibeLeads is an alternative for list building, enrichment, signal
            research and scoring when those are the workflows you need.
            GojiBerry overlaps on signal-based prospecting. Xply describes
            social feedback workflows. VibeLeads focuses on finding and
            qualifying prospects for your offer.
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
