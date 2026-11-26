import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { openSession, sealSession } from "../lib/workspace/session-codec";
import {
  columns,
  datasetCsv,
  historyStatus,
  isOwnedRun,
  pageNumber,
} from "../lib/workspace/data-view";

test("Apify cookies are authenticated and restricted to their intended purpose", () => {
  const key = randomBytes(32);
  const account = { accessToken: "fixture-credential", expiresAt: 120 };
  const value = sealSession("account", account, key);
  assert.deepEqual(openSession("account", value, key), account);
  assert(!value.includes(account.accessToken));
  assert.equal(openSession("oauth", value, key), null);
  assert.equal(openSession("account", value, randomBytes(32)), null);
  const bytes = Buffer.from(value, "base64url");
  bytes[15] ^= 1;
  assert.equal(openSession("account", bytes.toString("base64url"), key), null);
  assert.equal(openSession("account", value + "=", key), null);
});

test("CSV export escapes quotes, formulas and newlines from dataset fields", () => {
  assert.equal(
    datasetCsv([{ name: 'Ada "A"', note: "=1+1", phone: "+1234567" }]),
    '"name","note","phone"\r\n"Ada ""A""","\'=1+1","\'+1234567"',
  );
  assert.match(datasetCsv([{ name: "two\nlines" }]), /"two\nlines"/);
});

test("Run history only accepts documented filters and positive page indices", () => {
  assert.equal(historyStatus("SUCCEEDED"), "SUCCEEDED");
  assert.equal(historyStatus("invalid"), undefined);
  assert.equal(pageNumber("-1"), 1);
  assert.equal(pageNumber("03"), 1);
  assert.equal(pageNumber("3"), 3);
  assert.deepEqual(
    columns([
      {
        raw: "x",
        email: "example@example.com",
        website: "example.com",
        name: "Example",
      },
    ]),
    ["name", "website", "email", "raw"],
  );
});

test("Actor identity and user ownership are checked independently", () => {
  assert(
    isOwnedRun(
      { actId: "our-actor", userId: "current" },
      "our-actor",
      "current",
    ),
  );
  assert(
    !isOwnedRun(
      { actId: "other-actor", userId: "current" },
      "our-actor",
      "current",
    ),
  );
  assert(
    !isOwnedRun(
      { actId: "our-actor", userId: "other" },
      "our-actor",
      "current",
    ),
  );
  assert(!isOwnedRun({ actId: "our-actor" }, "our-actor", "current"));
});
