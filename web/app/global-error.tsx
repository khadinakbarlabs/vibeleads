"use client";

/**
 * Last-resort error boundary.
 *
 * Catches errors thrown by the root layout itself — fonts failing to
 * load, ThemeBootstrap throwing, providers crashing on mount. Replaces
 * the entire <html>/<body> tree (the root layout has failed, so we
 * cannot rely on it).
 *
 * That means:
 *  - We render our own <html>/<body>
 *  - We CANNOT use Tailwind utility classes that depend on globals.css
 *    being loaded — globals.css is imported by RootLayout and will not
 *    be in this bundle. Inline styles only.
 *  - We CANNOT use <Link> from next/link — it depends on the router
 *    context that the failing layout was supposed to provide. Use plain
 *    <a> tags with full reloads.
 *  - We CANNOT use the theme tokens (--color-bg etc.) — same reason.
 *
 * The /api/* routes don't need this boundary; they have their own JSON
 * error envelopes and don't render the root layout.
 *
 * If THIS file throws, Next falls back to its built-in error page.
 * That's why the markup here stays minimal — fewer moving parts, fewer
 * ways to fail.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Browser console gets the full error so users reporting an issue
    // can paste the digest. Sentry (when wired) also captures these
    // before this boundary renders.
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          // Honors the OS color preference since we can't read the
          // saved theme without ThemeBootstrap.
          backgroundColor: "Canvas",
          color: "CanvasText",
          // Subtle accent ring on the card so it doesn't look unstyled
          // even when CSS variables aren't available.
          colorScheme: "light dark",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "32rem",
            border:
              "1px solid color-mix(in oklab, CanvasText 14%, transparent)",
            borderRadius: "1rem",
            padding: "2rem",
            backgroundColor: "color-mix(in oklab, Canvas 96%, CanvasText 4%)",
          }}
        >
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.6,
              margin: 0,
            }}
          >
            VibeLeads · fatal error
          </p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            We couldn&apos;t load the app shell
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
              opacity: 0.78,
            }}
          >
            Something failed before the page could render. The Reload button
            tries the whole route again. If it keeps failing, your network or an
            extension may be blocking required resources.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "1rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.6875rem",
                opacity: 0.55,
              }}
            >
              ref: <code>{error.digest}</code>
            </p>
          )}

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={buttonStyle(true)}
            >
              Reload
            </button>
            {/*
              eslint-disable-next-line @next/next/no-html-link-for-pages --
              global-error replaces the root layout, so the next/link
              router context isn't available. A plain <a> with a full
              page reload is the correct primitive here.
            */}
            <a href="/" style={buttonStyle(false)}>
              Back to landing
            </a>
          </div>

          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "0.8125rem",
              opacity: 0.55,
            }}
          >
            If this persists, email{" "}
            <a
              href="mailto:hello@vibeleads.app"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              hello@vibeleads.app
            </a>
            {error.digest ? ` with ref ${error.digest}.` : "."}
          </p>
        </main>
      </body>
    </html>
  );
}

/**
 * Inline button style. Two variants:
 *  - primary (filled): contrasts with the card surface using CanvasText
 *  - secondary (outlined): blends into the card, just a border
 *
 * Both use system color keywords so they respect the OS color scheme
 * even when our theme tokens aren't loaded.
 */
function buttonStyle(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    height: "2.25rem",
    padding: "0 0.875rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    color: primary ? "Canvas" : "CanvasText",
    backgroundColor: primary ? "CanvasText" : "transparent",
    border: primary
      ? "1px solid CanvasText"
      : "1px solid color-mix(in oklab, CanvasText 22%, transparent)",
  };
}
