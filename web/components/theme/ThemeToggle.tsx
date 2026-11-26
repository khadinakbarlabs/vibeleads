"use client";

/**
 * Theme toggle. Three states: system / light / dark, persisted in
 * localStorage under `vl-theme`. The actual `data-theme` attribute on
 * <html> is set both by this component AND by an inline boot script in
 * <ThemeBootstrap /> so there's no flash of wrong-theme on first paint.
 */
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "vl-theme";

function applyTheme(choice: ThemeChoice) {
  const html = document.documentElement;
  if (choice === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.dataset.theme = dark ? "dark" : "light";
  } else {
    html.dataset.theme = choice;
  }
}

export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved =
      (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? "system";
    // Defer setState into the next frame so React doesn't trigger a
    // cascading render in the same effect tick. Same observable result;
    // satisfies the react-hooks/set-state-in-effect lint rule.
    const raf = requestAnimationFrame(() => {
      setChoice(saved);
      setMounted(true);
    });
    // Track system preference changes for the "system" choice.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem(STORAGE_KEY) ?? "system") === "system")
        applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", handler);
    };
  }, []);

  function pick(next: ThemeChoice) {
    setChoice(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const dims =
    size === "sm" ? "h-7 px-2 text-[11px] gap-1.5" : "h-8 px-2.5 text-xs gap-2";
  const iconCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0.5 font-mono uppercase tracking-[0.18em]",
        mounted ? "" : "invisible", // avoid hydration flash
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      <Pick
        value="light"
        active={choice === "light"}
        onPick={pick}
        dims={dims}
        icon={<Sun className={iconCls} />}
        label="light"
      />
      <Pick
        value="system"
        active={choice === "system"}
        onPick={pick}
        dims={dims}
        icon={<Monitor className={iconCls} />}
        label="auto"
      />
      <Pick
        value="dark"
        active={choice === "dark"}
        onPick={pick}
        dims={dims}
        icon={<Moon className={iconCls} />}
        label="dark"
      />
    </div>
  );
}

function Pick({
  value,
  active,
  onPick,
  dims,
  icon,
  label,
}: {
  value: ThemeChoice;
  active: boolean;
  onPick: (v: ThemeChoice) => void;
  dims: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onPick(value)}
      className={cn(
        "inline-flex items-center rounded-full transition-colors",
        dims,
        active
          ? "bg-[var(--color-fg)] text-[var(--color-bg)]"
          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Inline boot script — applies the saved theme before React hydrates so
 * the initial paint doesn't flash light → dark.
 *
 * Rendered as a plain <script> tag (not next/script) because Next 16
 * deprecates <Script strategy="beforeInteractive"> outside the legacy
 * pages/_document.js. A regular inline script in the document <head>
 * runs synchronously during HTML parse — even earlier than the old
 * beforeInteractive timing — so there's no flash of unstyled theme.
 *
 * The string is hard-coded (no user input), so XSS isn't a concern.
 */
const BOOT_JS = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}')||'system';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export function ThemeBootstrap() {
  return (
    <script
      id="vl-theme-bootstrap"
      dangerouslySetInnerHTML={{ __html: BOOT_JS }}
    />
  );
}
