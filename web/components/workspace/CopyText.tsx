"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyText({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"ready" | "copied" | "manual">("ready");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  return (
    <div className="vl-copy">
      <button type="button" className="vl-button vl-secondary" onClick={copy}>
        {status === "copied" ? (
          <Check size={16} aria-hidden />
        ) : (
          <Copy size={16} aria-hidden />
        )}
        {status === "copied" ? "Copied" : label}
      </button>
      <span className="vl-copy-status" role="status">
        {status === "copied"
          ? "Copied to clipboard."
          : status === "manual"
            ? "Select and copy the text above."
            : ""}
      </span>
    </div>
  );
}
