import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — VibeLeads",
  description: "VibeLeads Terms of Service.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:px-10">
      <Link
        href="/"
        className="mb-12 inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        ← Back to VibeLeads
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        Last updated: May 2026
      </p>

      <div className="mt-10 space-y-8 text-[var(--color-fg-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3">
            By accessing or using VibeLeads (&ldquo;Service&rdquo;), you agree
            to be bound by these Terms of Service. If you do not agree, do not
            use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            2. Service Description
          </h2>
          <p className="mt-3">
            VibeLeads is an AI-powered lead generation platform that aggregates
            publicly available business information from the web and third-party
            data sources. Results are provided for lawful business development
            and outreach purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            3. Acceptable Use
          </h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the Service for spam, harassment, or illegal outreach.</li>
            <li>
              Resell or redistribute raw data obtained through the Service
              without written permission.
            </li>
            <li>
              Attempt to reverse-engineer, scrape, or systematically download
              the Service itself.
            </li>
            <li>
              Use the Service in violation of CAN-SPAM, GDPR, CCPA, or any other
              applicable law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            4. Credits and Billing
          </h2>
          <p className="mt-3">
            Credits are consumed per lead generated and per enrichment action.
            Unused credits roll over for one billing cycle. Refunds are issued
            automatically for failed enrichment lookups. Subscription fees are
            non-refundable except as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            5. Data Accuracy
          </h2>
          <p className="mt-3">
            VibeLeads aggregates publicly available data. We make no warranty as
            to accuracy, completeness, or fitness for a particular purpose. You
            are responsible for verifying data before acting on it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            6. Intellectual Property
          </h2>
          <p className="mt-3">
            The Service, including its software, design, and AI models, is owned
            by VibeLeads. You retain ownership of prompts and configurations you
            create.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            7. Disclaimer of Warranties
          </h2>
          <p className="mt-3">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF
            ANY KIND. WE DISCLAIM ALL IMPLIED WARRANTIES INCLUDING
            MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            8. Limitation of Liability
          </h2>
          <p className="mt-3">
            TO THE FULLEST EXTENT PERMITTED BY LAW, VIBELEADS SHALL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL
            DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            9. Termination
          </h2>
          <p className="mt-3">
            We reserve the right to suspend or terminate your account for
            violation of these terms at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            10. Changes to Terms
          </h2>
          <p className="mt-3">
            We may update these terms at any time. Continued use after changes
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-fg)]">
            11. Contact
          </h2>
          <p className="mt-3">
            Questions?{" "}
            <a
              href="mailto:hello@vibeleads.app"
              className="text-[var(--color-accent)] hover:underline"
            >
              hello@vibeleads.app
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
