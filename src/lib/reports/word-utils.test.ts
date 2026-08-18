import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeFileNameSegment } from "./word-utils.ts";

test("sanitizeFileNameSegment normalizes client names for downloads", () => {
  assert.equal(sanitizeFileNameSegment(" ACME Norge AS ", "Kunde"), "ACME_Norge_AS");
  assert.equal(sanitizeFileNameSegment("***", "Kunde"), "Kunde");
});

test("sanitizeFileNameSegment keeps Norwegian letters in download names", () => {
  assert.equal(sanitizeFileNameSegment("Bærum Ø-bygg AS", "Kunde"), "Bærum_Ø-bygg_AS");
  assert.equal(sanitizeFileNameSegment("Ås".normalize("NFD"), "Kunde"), "Ås");
});
