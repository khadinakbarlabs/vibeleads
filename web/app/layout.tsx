import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeBootstrap } from "@/components/theme/ThemeToggle";
import "./globals.css";
import "./vibeleads.css";
import "./results.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vibeleads.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VibeLeads — Prospecting for sales teams and AI assistants",
    template: "%s — VibeLeads",
  },
  description:
    "Connect VibeLeads to your AI agent through Apify MCP. View run history, browse datasets and export results in the dashboard.",
  applicationName: "VibeLeads",
  authors: [{ name: "VibeLeads" }],
  keywords: [
    "business prospecting",
    "website lead generation",
    "Apify",
    "MCP",
    "lead generation",
  ],
  openGraph: {
    type: "website",
    siteName: "VibeLeads",
    title: "VibeLeads — Prospecting for sales teams and AI assistants",
    description:
      "Find and qualify prospects by business type, city and evidence.",
    url: siteUrl,
    // Image is auto-included from app/opengraph-image.tsx.
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeLeads — Prospecting for sales teams and AI assistants",
    description:
      "Find and qualify prospects by business type, city and evidence.",
    // Image is auto-included from app/opengraph-image.tsx.
  },
  robots: { index: true, follow: true },
};

/**
 * Viewport / theme-color — moved out of `metadata` per Next 14+ APIs.
 * Mobile browser chrome (Safari/Chrome address bar) tinted to match the
 * app background. Both light + dark anchors so the chrome doesn't flash
 * white when the user has dark theme set at the OS level.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(99% 0.004 264)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(15% 0.012 264)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning because the ThemeBootstrap script flips
      // the data-theme attribute before React hydrates — the HTML prop
      // intentionally differs between server and client.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeBootstrap />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
