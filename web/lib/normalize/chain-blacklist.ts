/**
 * Curated denylist of national / global chains that mess up "independent
 * businesses only" prospecting plays. Used by the `independent_only`
 * post-filter to drop chain hits without burning the user's quota.
 *
 * The match strategy is two-pronged:
 *   1. Domain match — if the lead's website hostname (with leading www
 *      stripped) ends with a chain root domain, exclude. This is the
 *      strongest signal because chain stores all live under a single
 *      corporate domain (e.g. a Marriott property's website is on
 *      marriott.com or one of its sub-brand domains).
 *   2. Name pattern match — if the lead's business name STARTS with a
 *      known chain wordmark (case-insensitive) we treat it as a chain.
 *      Avoids false-positives by matching on a leading word boundary
 *      so 'Old McDonald's Farm' doesn't match 'McDonald's'.
 *
 * Categories: hotels, fast food, casual dining, retail, gyms, salons,
 * coffee, gas stations, banks, telcos, drugstores. Add to the list
 * incrementally — the audit's UC-3, UC-14, UC-15 use cases rely on
 * this for dental / hotel / bike-shop "independent only" plays.
 */

interface ChainEntry {
  /** Canonical brand name (used in the human-readable filter summary). */
  name: string;
  /** Lowercased domain roots — match if hostname ends with these. */
  domains: string[];
  /** Lowercased name patterns — match if business name starts with these. */
  namePatterns: string[];
}

const CHAINS: ChainEntry[] = [
  // ─── Hotels ────────────────────────────────────────────────────────────
  {
    name: "Marriott",
    domains: [
      "marriott.com",
      "ritzcarlton.com",
      "westin.com",
      "sheraton.com",
      "courtyard.com",
      "fairfield.com",
      "renaissancehotels.com",
      "residenceinn.com",
    ],
    namePatterns: [
      "marriott",
      "ritz-carlton",
      "ritz carlton",
      "westin",
      "sheraton",
      "courtyard by marriott",
      "fairfield inn",
      "renaissance hotel",
      "residence inn",
    ],
  },
  {
    name: "Hilton",
    domains: [
      "hilton.com",
      "hampton.com",
      "doubletree.com",
      "embassysuites.com",
      "homewoodsuites.com",
    ],
    namePatterns: [
      "hilton",
      "hampton inn",
      "doubletree",
      "embassy suites",
      "homewood suites",
    ],
  },
  {
    name: "IHG",
    domains: [
      "ihg.com",
      "holidayinn.com",
      "crowneplaza.com",
      "kimptonhotels.com",
      "intercontinental.com",
    ],
    namePatterns: [
      "holiday inn",
      "crowne plaza",
      "kimpton",
      "intercontinental",
    ],
  },
  { name: "Hyatt", domains: ["hyatt.com"], namePatterns: ["hyatt"] },
  {
    name: "Wyndham",
    domains: [
      "wyndhamhotels.com",
      "wyndham.com",
      "ramada.com",
      "daysinn.com",
      "super8.com",
      "laquinta.com",
    ],
    namePatterns: ["wyndham", "ramada", "days inn", "super 8", "la quinta"],
  },
  {
    name: "Best Western",
    domains: ["bestwestern.com"],
    namePatterns: ["best western"],
  },
  {
    name: "Choice Hotels",
    domains: ["choicehotels.com", "comfortinn.com", "qualityinn.com"],
    namePatterns: ["comfort inn", "quality inn", "clarion hotel"],
  },
  // ─── Fast food ─────────────────────────────────────────────────────────
  {
    name: "McDonald's",
    domains: ["mcdonalds.com"],
    namePatterns: ["mcdonald's", "mcdonalds"],
  },
  {
    name: "Starbucks",
    domains: ["starbucks.com"],
    namePatterns: ["starbucks"],
  },
  { name: "Subway", domains: ["subway.com"], namePatterns: ["subway"] },
  {
    name: "Burger King",
    domains: ["bk.com", "burgerking.com"],
    namePatterns: ["burger king"],
  },
  {
    name: "KFC",
    domains: ["kfc.com"],
    namePatterns: ["kfc", "kentucky fried chicken"],
  },
  { name: "Pizza Hut", domains: ["pizzahut.com"], namePatterns: ["pizza hut"] },
  {
    name: "Domino's",
    domains: ["dominos.com"],
    namePatterns: ["domino's", "dominos pizza"],
  },
  { name: "Taco Bell", domains: ["tacobell.com"], namePatterns: ["taco bell"] },
  {
    name: "Wendy's",
    domains: ["wendys.com"],
    namePatterns: ["wendy's", "wendys"],
  },
  {
    name: "Dunkin'",
    domains: ["dunkindonuts.com", "dunkin.com"],
    namePatterns: ["dunkin'", "dunkin "],
  },
  { name: "Chipotle", domains: ["chipotle.com"], namePatterns: ["chipotle"] },
  { name: "Five Guys", domains: ["fiveguys.com"], namePatterns: ["five guys"] },
  { name: "Panera", domains: ["panerabread.com"], namePatterns: ["panera"] },
  // ─── Casual / sit-down dining ──────────────────────────────────────────
  {
    name: "Olive Garden",
    domains: ["olivegarden.com"],
    namePatterns: ["olive garden"],
  },
  {
    name: "Applebee's",
    domains: ["applebees.com"],
    namePatterns: ["applebee's", "applebees"],
  },
  {
    name: "Chili's",
    domains: ["chilis.com"],
    namePatterns: ["chili's", "chilis grill"],
  },
  {
    name: "TGI Fridays",
    domains: ["tgifridays.com"],
    namePatterns: ["tgi friday", "t.g.i. friday"],
  },
  { name: "IHOP", domains: ["ihop.com"], namePatterns: ["ihop"] },
  {
    name: "Denny's",
    domains: ["dennys.com"],
    namePatterns: ["denny's", "dennys"],
  },
  // ─── Retail ────────────────────────────────────────────────────────────
  { name: "Walmart", domains: ["walmart.com"], namePatterns: ["walmart"] },
  { name: "Target", domains: ["target.com"], namePatterns: ["target"] },
  { name: "Costco", domains: ["costco.com"], namePatterns: ["costco"] },
  { name: "IKEA", domains: ["ikea.com"], namePatterns: ["ikea"] },
  { name: "Best Buy", domains: ["bestbuy.com"], namePatterns: ["best buy"] },
  // ─── Gyms / fitness ────────────────────────────────────────────────────
  {
    name: "Anytime Fitness",
    domains: ["anytimefitness.com"],
    namePatterns: ["anytime fitness"],
  },
  {
    name: "Planet Fitness",
    domains: ["planetfitness.com"],
    namePatterns: ["planet fitness"],
  },
  {
    name: "LA Fitness",
    domains: ["lafitness.com"],
    namePatterns: ["la fitness"],
  },
  {
    name: "24 Hour Fitness",
    domains: ["24hourfitness.com"],
    namePatterns: ["24 hour fitness"],
  },
  { name: "Equinox", domains: ["equinox.com"], namePatterns: ["equinox"] },
  {
    name: "Crunch Fitness",
    domains: ["crunch.com"],
    namePatterns: ["crunch fitness"],
  },
  {
    name: "Orangetheory",
    domains: ["orangetheoryfitness.com"],
    namePatterns: ["orangetheory"],
  },
  { name: "F45", domains: ["f45training.com"], namePatterns: ["f45"] },
  {
    name: "CorePower Yoga",
    domains: ["corepoweryoga.com"],
    namePatterns: ["corepower yoga", "corepower"],
  },
  {
    name: "SoulCycle",
    domains: ["soul-cycle.com", "soulcycle.com"],
    namePatterns: ["soulcycle"],
  },
  {
    name: "Pure Barre",
    domains: ["purebarre.com"],
    namePatterns: ["pure barre"],
  },
  // ─── Coffee / quick service ────────────────────────────────────────────
  {
    name: "Tim Hortons",
    domains: ["timhortons.com"],
    namePatterns: ["tim hortons"],
  },
  {
    name: "Peet's Coffee",
    domains: ["peets.com"],
    namePatterns: ["peet's coffee", "peets coffee"],
  },
  // ─── Salons / spa ──────────────────────────────────────────────────────
  {
    name: "Great Clips",
    domains: ["greatclips.com"],
    namePatterns: ["great clips"],
  },
  {
    name: "Supercuts",
    domains: ["supercuts.com"],
    namePatterns: ["supercuts"],
  },
  {
    name: "Sport Clips",
    domains: ["sportclips.com"],
    namePatterns: ["sport clips"],
  },
  // ─── Drugstores ────────────────────────────────────────────────────────
  {
    name: "CVS",
    domains: ["cvs.com"],
    namePatterns: ["cvs pharmacy", "cvs/pharmacy"],
  },
  {
    name: "Walgreens",
    domains: ["walgreens.com"],
    namePatterns: ["walgreens"],
  },
  { name: "Rite Aid", domains: ["riteaid.com"], namePatterns: ["rite aid"] },
];

/** Returns null if the lead is independent, or the matched chain name otherwise. */
export function matchChain(lead: {
  business_name: string | null;
  website: string | null;
}): string | null {
  if (lead.website) {
    try {
      const host = new URL(lead.website).hostname
        .toLowerCase()
        .replace(/^www\./, "");
      for (const chain of CHAINS) {
        for (const d of chain.domains) {
          if (host === d || host.endsWith("." + d)) return chain.name;
        }
      }
    } catch {
      // bad URL — fall through to name match
    }
  }
  const name = (lead.business_name ?? "").toLowerCase().trim();
  if (name.length > 0) {
    for (const chain of CHAINS) {
      for (const p of chain.namePatterns) {
        if (
          name === p ||
          name.startsWith(p + " ") ||
          name.startsWith(p + "-")
        ) {
          return chain.name;
        }
      }
    }
  }
  return null;
}

/** Total chains in the registry — exposed so the post-filter description can say so. */
export const CHAIN_REGISTRY_SIZE = CHAINS.length;
