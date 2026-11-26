import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CopyText } from "@/components/workspace/CopyText";
import { capabilities } from "@/lib/workspace/capabilities";
import { MCP_URL } from "@/lib/workspace/config";

const starters = ["local", "website", "jobs", "weekly"];

export function GetStarted({ username }: { username: string }) {
  return (
    <section className="gs" aria-labelledby="gs-title">
      <div className="gs-steps">
        <h2 id="gs-title">Your results will appear here</h2>
        <ol>
          <li className="gs-done">
            <span aria-hidden>
              <Check size={15} />
            </span>
            <div>
              <strong>Signed in with Apify</strong>
              <small>{username}</small>
            </div>
          </li>
          <li className="gs-current">
            <span aria-hidden>2</span>
            <div>
              <strong>Connect your AI assistant</strong>
              <small>
                Use this address in Claude, ChatGPT, Cursor or Codex.
              </small>
              <code>{MCP_URL}</code>
              <div className="gs-actions">
                <CopyText value={MCP_URL} label="Copy address" />
                <Link href="/connect" className="vl-button vl-primary">
                  Step-by-step setup <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          </li>
          <li>
            <span aria-hidden>3</span>
            <div>
              <strong>Ask for your first list</strong>
              <small>Each run shows up here to sort, filter and export.</small>
            </div>
          </li>
        </ol>
      </div>
      <div className="gs-ideas">
        <h3>Try asking</h3>
        <ul>
          {capabilities
            .filter((c) => starters.includes(c.id))
            .map((c) => (
              <li key={c.id}>
                <small>{c.name}</small>
                <q>{c.ask}</q>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
