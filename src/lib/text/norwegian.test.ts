import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNorwegian, normalizeNorwegianDeep, toAsciiFileName } from "./norwegian.ts";

test("normalizeNorwegian recomposes decomposed letters", () => {
  const decomposed = "Støy på Bærum".normalize("NFD");
  assert.notEqual(decomposed, "Støy på Bærum");
  assert.equal(normalizeNorwegian(decomposed), "Støy på Bærum");
});

test("normalizeNorwegian keeps precomposed letters and plain ASCII intact", () => {
  assert.equal(normalizeNorwegian("Støymåling æøåÆØÅ"), "Støymåling æøåÆØÅ");
  assert.equal(normalizeNorwegian("plain ascii"), "plain ascii");
});

test("normalizeNorwegian removes invisible characters", () => {
  const zeroWidthSpace = String.fromCodePoint(0x200b);
  const bom = String.fromCodePoint(0xfeff);
  assert.equal(normalizeNorwegian(`${bom}måling${zeroWidthSpace}er`), "målinger");
});

test("normalizeNorwegianDeep walks nested structures without touching class instances", () => {
  const timestamp = new Date("2026-01-01T00:00:00Z");
  const input = {
    room: "Møterom".normalize("NFD"),
    samples: [{ label: "Ås".normalize("NFD"), timestamp }],
    count: 3,
    missing: null,
  };

  const result = normalizeNorwegianDeep(input);

  assert.equal(result.room, "Møterom");
  assert.equal(result.samples[0].label, "Ås");
  assert.equal(result.samples[0].timestamp, timestamp);
  assert.equal(result.count, 3);
  assert.equal(result.missing, null);
});

test("toAsciiFileName transliterates instead of dropping letters", () => {
  assert.equal(toAsciiFileName("Støymåling på møterom", "Rapport"), "Stoymaling_pa_moterom");
  assert.equal(toAsciiFileName("Bærum kommune", "Kunde"), "Baerum_kommune");
  assert.equal(toAsciiFileName("Ås".normalize("NFD"), "Kunde"), "As");
  assert.equal(toAsciiFileName("Café Ærlig", "Kunde"), "Cafe_Aerlig");
});

test("toAsciiFileName falls back when nothing usable remains", () => {
  assert.equal(toAsciiFileName("   ", "Kunde"), "Kunde");
  assert.equal(toAsciiFileName("***", "Kunde"), "Kunde");
});
