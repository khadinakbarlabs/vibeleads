"use client";

/**
 * Outreach quick-targets for the dashboard. One click pre-fills the
 * campaign wizard with a business type, a location, and a starter pitch
 * the AI message step expands on. Distinct from IcpTemplates (which
 * seeds free-text lead-gen prompts at /search/new) — these carry
 * structured targeting params straight into /outreach/new.
 */
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  UtensilsCrossed,
  Megaphone,
  Dumbbell,
  Scale,
  Hotel,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TONE_CLASS, type Tone } from "@/lib/ui/tone";

interface Template {
  Icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  businessType: string;
  location: string;
  pitch: string;
}

const TEMPLATES: Template[] = [
  {
    Icon: Stethoscope,
    tone: "sky",
    title: "Dental & medical",
    businessType: "dental practices",
    location: "Austin, TX",
    pitch: "I help local practices get more 5-star Google reviews.",
  },
  {
    Icon: UtensilsCrossed,
    tone: "amber",
    title: "Restaurants",
    businessType: "restaurants",
    location: "Miami, FL",
    pitch: "We design menus and manage their delivery-app presence.",
  },
  {
    Icon: Megaphone,
    tone: "violet",
    title: "Agencies",
    businessType: "marketing agencies",
    location: "New York, NY",
    pitch: "We white-label contact-form outreach for agencies.",
  },
  {
    Icon: Dumbbell,
    tone: "emerald",
    title: "Gyms & studios",
    businessType: "independent gyms",
    location: "Los Angeles, CA",
    pitch: "We fill empty class slots with a booking funnel.",
  },
  {
    Icon: Scale,
    tone: "stone",
    title: "Law firms",
    businessType: "law firms",
    location: "Chicago, IL",
    pitch: "I build and maintain conversion-focused law websites.",
  },
  {
    Icon: Hotel,
    tone: "rose",
    title: "Boutique hotels",
    businessType: "boutique hotels",
    location: "San Diego, CA",
    pitch: "We grow direct bookings and cut OTA commission.",
  },
];

export function OutreachTemplates() {
  const router = useRouter();

  function pick(t: Template) {
    const params = new URLSearchParams({
      businessType: t.businessType,
      location: t.location,
      pitch: t.pitch,
    });
    router.push(`/outreach/new?${params.toString()}`);
  }

  return (
    <div>
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight">
          Or start from a target
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-subtle)]">
          One click to pre-fill the wizard
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TEMPLATES.map((t) => {
          const Icon = t.Icon;
          return (
            <li key={t.title}>
              <button
                type="button"
                onClick={() => pick(t)}
                className={cn(
                  "group flex h-full w-full flex-col items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-all",
                  "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)]",
                  "motion-reduce:hover:translate-y-0",
                )}
                title={`${t.businessType} · ${t.location}`}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg ring-1 ring-inset ring-[var(--color-border)]",
                    TONE_CLASS[t.tone],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium tracking-tight">
                    {t.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-[var(--color-fg-subtle)]">
                    {t.location}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
