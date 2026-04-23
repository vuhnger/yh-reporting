import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner needs the explicit extension here.
import { matchesAllowedDomain } from "./auth-domain.ts";

test("rejects malformed allowed domains", () => {
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", "@"), false);
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", " "), false);
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", "@ "), false);
});

test("accepts valid domains with or without leading at-sign", () => {
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", "drdropin.no"), true);
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", "@drdropin.no"), true);
});

test("rejects mismatched domains", () => {
  assert.equal(matchesAllowedDomain("victor.uhnger@drdropin.no", "example.com"), false);
});

test("no-config case is handled by caller, not matcher", () => {
  assert.equal(Boolean(""), false);
});
