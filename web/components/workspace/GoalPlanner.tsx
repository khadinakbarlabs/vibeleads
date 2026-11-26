"use client";

import { useState } from "react";
import Link from "next/link";
import {
  journeys,
  destinations,
  recommendApproach,
} from "@/lib/workspace/journey";
import { CopyText } from "./CopyText";

export function GoalPlanner() {
  const [goal, setGoal] = useState<string>("clients");
  const [briefs, setBriefs] = useState<Record<string, string>>({});
  const [route, setRoute] = useState(0);
  const [destination, setDestination] = useState("");
  const [examples, setExamples] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const journey = journeys.find((item) => item.id === goal) ?? journeys[0];
  const brief = briefs[goal] ?? "";
  const [approach, outcome] = journey.routes[route];
  const target = destinations.find(([name]) => name === destination);
  const example =
    goal === "linkedin"
      ? "Hi [name], I saw [specific work]. I help [audience] with [problem]. Would it be useful to compare notes?"
      : goal === "email"
        ? "Hi [name], I noticed [verified detail]. I help [audience] with [problem]. Would a short example be useful?\n[Sender details and opt-out]"
        : "";
  const editedExample = examples[goal] ?? example;
  const draft = [
    brief.trim(),
    "My goal is to " + journey.title.toLowerCase() + ".",
    "Preferred approach: " + approach + ". " + outcome,
    example && editedExample.trim()
      ? "Draft for review only:\n" + editedExample.trim()
      : "",
    target
      ? "Destination: " + target[0] + ". " + target[1]
      : "Let me review the results first.",
    "Reuse what I told you. Ask one question at a time only if it changes the plan. Check available tools and connections, show deliverables and a real quote, and wait for my approval. After approval, carry out the agreed steps, report results and recommend one next action.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <section
      className="vl-planner"
      id="workflows"
      aria-labelledby="planner-heading"
    >
      <h2 id="planner-heading">
        {
          [
            "What would you like to do?",
            "Which approach fits you?",
            "Review your brief",
          ][step]
        }
      </h2>
      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (brief.trim()) {
              setRoute(recommendApproach(goal, brief));
              setStep(1);
            }
          }}
        >
          <label htmlFor="vl-goal">Goal</label>
          <select
            id="vl-goal"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setRoute(0);
            }}
          >
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <label htmlFor="vl-brief">{journey.question}</label>
          <textarea
            id="vl-brief"
            required
            maxLength={2000}
            rows={3}
            value={brief}
            placeholder={journey.example}
            onChange={(e) => setBriefs({ ...briefs, [goal]: e.target.value })}
          />
          <button className="vl-button vl-primary" disabled={!brief.trim()}>
            Compare approaches
          </button>
        </form>
      )}
      {step === 1 && (
        <div>
          <fieldset>
            <legend>{journey.title}</legend>
            {journey.routes.map(([name, detail], i) => (
              <label className="vl-route" key={name}>
                <input
                  type="radio"
                  name="approach"
                  checked={route === i}
                  onChange={() => setRoute(i)}
                />
                <span>
                  <strong>
                    {name}
                    {i === recommendApproach(goal, brief)
                      ? " · Suggested for your brief"
                      : ""}
                  </strong>
                  <small>{detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="vl-destination">Where should the results go?</label>
          <select
            id="vl-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Review in VibeLeads first</option>
            {destinations.map(([name]) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          {target && <p>{target[1]}</p>}
          <div className="vl-actions">
            <button className="vl-button vl-primary" onClick={() => setStep(2)}>
              Review brief
            </button>
            <button
              className="vl-button vl-secondary"
              onClick={() => setStep(0)}
            >
              Back
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <p>
            Copy this brief into your connected AI assistant. It will check
            availability and ask you to approve the actual plan and cost there.
          </p>
          {example && (
            <>
              <label htmlFor="draft-example">Edit the sample message</label>
              <textarea
                id="draft-example"
                rows={4}
                maxLength={2000}
                value={editedExample}
                onChange={(e) =>
                  setExamples({ ...examples, [goal]: e.target.value })
                }
              />
            </>
          )}
          <pre className="vl-brief">{draft}</pre>
          <div className="vl-actions">
            <CopyText value={draft} label="Copy agent brief" />
            <button
              className="vl-button vl-secondary"
              onClick={() => setStep(1)}
            >
              Edit choices
            </button>
          </div>
          <p>
            <strong>Suggested next step</strong>
            <br />
            {journey.next}
          </p>
          <Link href="/connect" className="vl-text-link">
            Connect my assistant
          </Link>
        </div>
      )}
    </section>
  );
}
