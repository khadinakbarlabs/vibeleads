import { destinations } from "@/lib/workspace/journey";

const guides = [
  "",
  "https://docs.apify.com/integrations/make",
  "https://docs.apify.com/integrations",
  "https://www.make.com/en/integrations/apify/google-calendar",
  "https://docs.reachinbox.ai/globalLeads",
  "https://docs.zapmail.ai/v1/zapmail-docs-825990m0",
  "https://www.linkedin.com/legal/user-agreement",
  "https://developers.google.com/analytics/devguides/reporting/data/v1",
];

export function ConnectionGuide() {
  return (
    <section id="connections" className="vl-data-block">
      <h2>Where can my results go?</h2>
      <p>
        Select a destination for setup details. Your assistant checks which
        actions your connected account can perform.
      </p>
      {destinations.map(([title, detail], i) => (
        <details className="vl-destination" key={title}>
          <summary>{title}</summary>
          <p>{detail}</p>
          {guides[i] && (
            <a href={guides[i]} className="vl-text-link">
              View setup or provider guidance
            </a>
          )}
        </details>
      ))}
    </section>
  );
}
