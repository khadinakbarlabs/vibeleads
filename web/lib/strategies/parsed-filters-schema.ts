/**
 * Zod schema for `ParsedFilters` (the input to `decide()`).
 *
 * Lives in its own module so we can reuse it from:
 *  - app/api/capabilities/decide/route.ts (body validation)
 *  - app/api/mcp/route.ts (tool manifest, via z.toJSONSchema)
 *  - any future server action that wants to validate a filter object
 *
 * The TypeScript type lives in `./types.ts` (declarative). This file
 * is the runtime validator. Keeping them in sync is currently a
 * manual exercise — the test surface is the verify-strategies script
 * which catches downstream regressions.
 */
import { z } from "zod";

export const ParsedFiltersSchema = z.object({
  location: z.string().optional(),
  category: z.string().optional(),
  rawPrompt: z.string().optional(),
  industry: z.string().optional(),
  limit: z.number().int().min(1).max(1_000).optional(),

  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  hasWebsite: z.boolean().optional(),
  noWebsite: z.boolean().optional(),
  noInstagram: z.boolean().optional(),
  noFacebook: z.boolean().optional(),
  noLinkedin: z.boolean().optional(),
  noSocials: z.boolean().optional(),
  independentOnly: z.boolean().optional(),
  hasContactForm: z.boolean().optional(),
  slowWebsite: z.boolean().optional(),

  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  minReviews: z.number().int().min(0).optional(),
  maxReviews: z.number().int().min(0).optional(),
  minPagespeed: z.number().int().min(0).max(100).optional(),
  maxPagespeed: z.number().int().min(0).max(100).optional(),

  hiringSignal: z.boolean().optional(),
  hiringRole: z.string().optional(),
  hiringWindow: z.enum(["24h", "7d", "30d", "any"]).optional(),
  seniorityLevel: z
    .array(
      z.enum(["entry", "associate", "mid_senior", "director", "executive"]),
    )
    .optional(),
  workArrangement: z.array(z.enum(["on_site", "remote", "hybrid"])).optional(),
  salaryFloor: z.number().int().min(0).optional(),

  source: z
    .enum([
      "google_maps",
      "google_serp",
      "linkedin_jobs",
      "linkedin_profiles",
      "producthunt",
      "yelp",
      "substack",
      "trustpilot",
    ])
    .optional(),

  /** Talent / people-as-leads signal — drives the talent_sourcing intent. */
  talentSignal: z.boolean().optional(),
  /** Reviews / reputation pull signal — drives reviews_* intents. */
  reviewsAudit: z.boolean().optional(),

  submitOutreach: z.boolean().optional(),
  outreach: z
    .object({
      senderName: z.string().min(1),
      senderEmail: z.string().email(),
      subject: z.string().optional(),
      message: z.string().min(1),
      senderPhone: z.string().optional(),
      senderCompany: z.string().optional(),
      senderWebsite: z.string().url().optional(),
      takeScreenshots: z.boolean().optional(),
    })
    .optional(),
});
