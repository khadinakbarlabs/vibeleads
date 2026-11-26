import Link from "next/link";
import { DM_Sans } from "next/font/google";
import { ArrowRight, Check, MessageSquareText } from "lucide-react";
import { Brand } from "@/components/workspace/Brand";
import { workspaceAccount } from "@/lib/workspace/auth";
import { capabilities, PRICE_NOTE } from "@/lib/workspace/capabilities";
import "./landing.css";

const font = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--landing-font",
});

const control = [
  ["You ask", "Describe who you want in plain words."],
  ["You approve", "See the plan and price before anything runs."],
  ["You keep the list", "Sort, filter and export it from your dashboard."],
];

export default async function Home() {
  const account = await workspaceAccount();
  return (
    <div className={font.variable + " vl-site lp"}>
      <a className="lp-skip" href="#main-content">
        Skip to content
      </a>
      <header className="lp-header lp-wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#ask">What you can ask</a>
          <Link href="/connect">Setup guide</Link>
        </nav>
        <a
          className="lp-account"
          href={account ? "/workspace" : "/auth/apify/start"}
        >
          {account ? "Open dashboard" : "Sign in"}
        </a>
      </header>

      <main id="main-content">
        <section className="lp-hero lp-wrap" aria-labelledby="landing-title">
          <p className="lp-eyebrow">Lead generation inside your AI assistant</p>
          <h1 id="landing-title">
            Ask your assistant for customers.{" "}
            <span>Get a list you can use.</span>
          </h1>
          <p className="lp-lede">
            VibeLeads finds businesses, checks them and explains why they might
            buy. Everything happens in Claude, ChatGPT or any assistant that
            supports connectors.
          </p>

          <ol className="lp-setup" aria-label="Get started in two steps">
            <li className={account ? "lp-done" : "lp-current"}>
              <span className="lp-num" aria-hidden>
                {account ? <Check size={16} /> : "1"}
              </span>
              <div>
                <h2>Sign in with Apify</h2>
                <p>
                  {account
                    ? `Signed in as ${account.username}.`
                    : "Free to create. Your searches run and are billed there."}
                </p>
              </div>
              {!account && (
                <a
                  className="lp-button lp-button-dark"
                  href="/auth/apify/start"
                >
                  Sign in with Apify
                  <ArrowRight size={17} aria-hidden />
                </a>
              )}
            </li>
            <li className={account ? "lp-current" : "lp-next"}>
              <span className="lp-num" aria-hidden>
                2
              </span>
              <div>
                <h2>Connect your AI assistant</h2>
                <p>Add VibeLeads to Claude, ChatGPT, Cursor or Codex.</p>
              </div>
              <Link
                className={
                  "lp-button " +
                  (account ? "lp-button-accent" : "lp-button-quiet")
                }
                href="/connect"
              >
                Connect assistant
                <ArrowRight size={17} aria-hidden />
              </Link>
            </li>
          </ol>

          <figure className="lp-chat" aria-label="Example request">
            <MessageSquareText size={18} aria-hidden />
            <blockquote>
              “Find 30 dentists in Austin with a slow website, and show me the
              price first.”
            </blockquote>
          </figure>
        </section>

        <section
          className="lp-ask lp-wrap"
          id="ask"
          aria-labelledby="ask-title"
        >
          <div className="lp-section-head">
            <h2 id="ask-title">What you can ask for</h2>
            <p>{PRICE_NOTE}</p>
          </div>
          <ul>
            {capabilities.map((c) => (
              <li key={c.id}>
                <h3>{c.name}</h3>
                <p>{c.text}</p>
                <q>{c.ask}</q>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-control lp-wrap" aria-label="How it works">
          {control.map(([title, text], i) => (
            <div key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>

        <section className="lp-final lp-wrap">
          <h2>Start with one request.</h2>
          <a
            className="lp-button lp-button-dark"
            href={account ? "/connect" : "/auth/apify/start"}
          >
            {account ? "Connect assistant" : "Sign in with Apify"}
            <ArrowRight size={17} aria-hidden />
          </a>
        </section>
      </main>

      <footer className="lp-footer lp-wrap">
        <Brand />
        <nav aria-label="Footer navigation">
          <Link href="/workspace">Dashboard</Link>
          <Link href="/connect">Connect an assistant</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
