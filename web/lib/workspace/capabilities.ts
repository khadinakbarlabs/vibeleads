// What customers can ask their AI assistant to do with VibeLeads.
// Keep in line with the live Actor README; each line describes a supported workflow.
export const capabilities = [
  {
    id: "local",
    name: "Local businesses",
    text: "Any business type in any city, with email, phone and a reason to contact them.",
    ask: "Find 30 dentists in Austin with a slow website.",
  },
  {
    id: "website",
    name: "Website problems",
    text: "Speed, search basics, broken links, email setup and missing websites.",
    ask: "Which of these roofers have a website that doesn’t load on phones?",
  },
  {
    id: "companies",
    name: "Companies and startups",
    text: "Business directories, funded startups, importers and companies that are hiring.",
    ask: "Find US software startups hiring their first marketer.",
  },
  {
    id: "search",
    name: "Google search prospects",
    text: "Businesses that show up for a search, then a check of their website.",
    ask: "Who ranks for ‘emergency plumber Denver’ and has a weak site?",
  },
  {
    id: "ads",
    name: "Meta and Google ads",
    text: "Check a page’s public ads and where they lead, or look up advertisers.",
    ask: "Check the ads for this Facebook page and audit where they lead.",
  },
  {
    id: "creators",
    name: "YouTube creators",
    text: "Creators for partnerships, with publicly listed contact details.",
    ask: "Find fitness YouTubers for a sponsorship.",
  },
  {
    id: "backlinks",
    name: "Backlink outreach",
    text: "Pages that link to your competitors, ranked, with a draft pitch.",
    ask: "Find sites linking to my two competitors but not to me.",
  },
  {
    id: "jobs",
    name: "Jobs shortlists",
    text: "Matching roles from an employer job board you may use, with apply links. $0.01 each.",
    ask: "Shortlist remote designer roles from this employer’s board.",
  },
  {
    id: "outreach",
    name: "Outreach help",
    text: "Pitch lines, email setup checks, opt-out wording and LinkedIn notes. You send.",
    ask: "Write a first line for each hot lead.",
  },
  {
    id: "weekly",
    name: "Weekly new leads",
    text: "Run the same search every week and get only businesses you haven’t seen.",
    ask: "Every Monday, send me new med spas in Miami.",
  },
] as const;

export const PRICE_NOTE =
  "You pay Apify for the searches you approve. Your assistant shows the price first and waits for your yes. Jobs shortlists add $0.01 each.";
