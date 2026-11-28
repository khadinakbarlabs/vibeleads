import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import nextConfig from "../next.config";

test("every public redirect to a home section targets a real landing-page element", async () => {
  const landing = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const redirects = await nextConfig.redirects!();
  const sections = redirects.filter((rule) => rule.destination.startsWith("/#"));
  assert.ok(sections.some((rule) => rule.source === "/why-vibeleads"));
  for (const { source, destination } of sections) {
    assert.ok(landing.includes('id="' + destination.slice(2) + '"'), source + " → " + destination);
  }
});
