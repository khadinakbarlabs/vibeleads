/**
 * Unified Lead shape that every actor's raw row gets mapped to before being
 * inserted into the `leads` table.
 */
export interface NormalizedLead {
  business_name: string | null;
  contact_name: string | null;
  category: string | null;
  categories: string[];
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  /** Direct link to the Google Maps profile (local_business / gmaps_leads only). */
  google_maps_url: string | null;
  /** Google Places place_id; primary dedupe signal when available. */
  place_id: string | null;
  /** Actor-computed 0–100 score. */
  lead_score: number | null;
  /** Original URL the row was scraped from (could be SERP page, contact page, etc.). */
  source_url: string | null;
  emails: string[];
  phones: string[];
  socials: Record<string, string>;
  rating: number | null;
  review_count: number | null;
  hours: Record<string, unknown> | null;
  description: string | null;
  raw: Record<string, unknown>;
  /** Stable per-account key for cross-search dedup. */
  dedupe_key: string;
}
