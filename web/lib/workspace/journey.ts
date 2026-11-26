// Shared by the public planner and the authenticated workspace.
export const journeys = [
  {
    id: "clients",
    title: "Find clients",
    question: "Who would make a good client, and where do they work?",
    example: "I build websites for dentists in Austin.",
    routes: [
      [
        "Build a shortlist",
        "Find businesses that match your audience and location.",
      ],
      [
        "Look for a reason to reach out",
        "Check a smaller group for website issues you can actually help fix.",
      ],
    ],
    next: "Review the evidence for the top three businesses before choosing whom to contact.",
  },
  {
    id: "enrich",
    title: "Improve a list",
    question: "What list do you have, and what is missing?",
    example: "I have a saved list of agencies and need reliable work emails.",
    routes: [
      ["Clean the list", "Flag duplicates and missing fields first."],
      [
        "Verify selected contacts",
        "Quote email or website checks for the rows you choose.",
      ],
    ],
    next: "Export the reviewed rows and keep uncertain addresses separate.",
  },
  {
    id: "email",
    title: "Prepare email outreach",
    question:
      "Who are you contacting, in which country, and what are you offering?",
    example:
      "I sell booking software to US dental practices and use ReachInbox.",
    routes: [
      [
        "Review email setup",
        "Check the sending domain, authentication, unsubscribe process and suppression list.",
      ],
      [
        "Draft a first email",
        "Use a verified business detail to write one short message for your review.",
      ],
    ],
    next: "Review the message, audience and opt-out process before approving any campaign enrollment.",
  },
  {
    id: "linkedin",
    title: "Plan LinkedIn outreach",
    question: "Which roles, market and relationship do you want to focus on?",
    example: "I want to meet UK agency owners through warm introductions.",
    routes: [
      [
        "Prepare introductions",
        "Draft a personal note for a human to review and send.",
      ],
      [
        "Organize CRM follow-ups",
        "Use authorized business records and the LinkedIn features your account permits.",
      ],
    ],
    next: "Choose one person to contact and verify the context yourself.",
  },
  {
    id: "partners",
    title: "Find creators or publishers",
    question: "Which audience do you want to reach and what can you offer?",
    example: "I want YouTube partners who teach bookkeeping to freelancers.",
    routes: [
      [
        "Research creators",
        "Review recent content, audience fit and public business contact routes.",
      ],
      [
        "Find guest-post or backlink opportunities",
        "Review referring pages, editorial fit and submission guidance.",
      ],
    ],
    next: "Select two relevant examples before drafting a partnership pitch.",
  },
  {
    id: "market",
    title: "Research a market",
    question: "Which market, geography and business signal matter to you?",
    example: "I want to find advertisers expanding into Texas.",
    routes: [
      [
        "Compare companies",
        "Build an evidence-backed sample by niche and geography.",
      ],
      [
        "Look for buyer signals",
        "Check available advertiser or hiring evidence and record when it was observed.",
      ],
    ],
    next: "Review the strongest signal before enriching contacts.",
  },
  {
    id: "jobs",
    title: "Find hiring opportunities",
    question: "Which role, location and employer board are you interested in?",
    example: "I want remote designer roles from an employer board I may use.",
    routes: [
      [
        "Find matching roles",
        "Check the available jobs tools and match a permitted board against your criteria.",
      ],
      [
        "Research hiring companies",
        "Use available hiring signals to prioritize prospective clients.",
      ],
    ],
    next: "Check the posting date and application link. A Greenhouse jobs shortlist costs $0.01 after you approve the quote.",
  },
  {
    id: "deliver",
    title: "Deliver or repeat results",
    question: "Which list do you want to deliver, to whom and how often?",
    example: "I want new approved leads in my team's spreadsheet every Friday.",
    routes: [
      [
        "Deliver once",
        "Review fields and destination, then export the selected results.",
      ],
      [
        "Repeat a search",
        "Quote one run and review the schedule and duplicate rules.",
      ],
    ],
    next: "Compare the delivered count with the receipt before scheduling another run.",
  },
] as const;

export const destinations = [
  [
    "CSV download",
    "Open a completed run in your dashboard and download the results.",
  ],
  [
    "Google Sheets or HubSpot",
    "Choose a sheet or CRM list. Check for duplicates and preview mapped fields. Available through a configured automation.",
  ],
  [
    "Gmail, Slack or Google Drive",
    "Use Apify’s integration settings for result emails, team alerts or files. Gmail outreach drafts need separate mailbox access.",
  ],
  [
    "Google Calendar",
    "Use a connected automation to create a follow-up reminder. Review the date and time zone.",
  ],
  [
    "Instantly or ReachInbox",
    "Use an authorized workspace to stage selected leads. Review suppression and whether the target campaign is active.",
  ],
  [
    "Zapmail",
    "Use an authorized connection to review mailbox and domain health. Confirm any configuration change separately.",
  ],
  [
    "LinkedIn or Sales Navigator",
    "Prepare a CRM task or manual message using access the customer is entitled to. Partner features depend on account permissions.",
  ],
  [
    "Search Console or GA4",
    "Use an authorized property to identify relevant pages, queries or tracked conversions.",
  ],
] as const;

const secondRouteSignals: Record<string, RegExp> = {
  clients: /slow|broken|outdated|no website|missing website|audit/i,
  enrich: /verif|deliverab|bounce|valid email/i,
  email: /draft|first email|copywriting|write a message/i,
  linkedin: /crm|follow.up|sales navigator/i,
  partners: /guest.?post|backlink|publisher|editorial/i,
  market: /hiring|advertis|buying signal/i,
  jobs: /prospect|selling to|sell to|hiring companies/i,
  deliver: /week|daily|repeat|recurr|schedule/i,
};

export function recommendApproach(goal: string, brief: string) {
  return secondRouteSignals[goal]?.test(brief) ? 1 : 0;
}
