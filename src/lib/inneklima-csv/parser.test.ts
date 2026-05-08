import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner needs the explicit extension here.
import { parseInneklimaCsv, parseInneklimaCsvBytes } from "./parser.ts";

const SAMPLE_HEADER = "Indeks;Dato;Ch-int1 Temp [°C];Ch-int2 %RH [%RH];Ch-int3 CO2 [ppm]";

function buildCsv(rows: string[], options: { sepHint?: boolean; header?: string } = {}): string {
  const { sepHint = true, header = SAMPLE_HEADER } = options;
  const lines: string[] = [];
  if (sepHint) lines.push("sep=;");
  lines.push(header);
  lines.push(...rows);
  return lines.join("\r\n");
}

test("parses a minimal Kimo Kistock CSV with sep=; hint", () => {
  const csv = buildCsv([
    "1;29.04.2026 14:46:46;23,2;20,3;492",
    "2;29.04.2026 14:56:46;22,5;19,0;449",
    "3;29.04.2026 15:06:46;21,6;19,6;446",
  ]);

  const result = parseInneklimaCsv(csv);

  assert.equal(result.samples.length, 3);
  assert.equal(result.metadata.sampleCount, 3);
  assert.equal(result.metadata.intervalSeconds, 600);
  assert.deepEqual(result.metadata.channels, { temperature: true, humidity: true, co2: true });

  assert.equal(result.samples[0].index, 1);
  assert.equal(result.samples[0].temperatureC, 23.2);
  assert.equal(result.samples[0].relativeHumidity, 20.3);
  assert.equal(result.samples[0].co2Ppm, 492);
});

test("computes min/max/avg correctly across all three metrics", () => {
  const csv = buildCsv([
    "1;29.04.2026 14:46:46;20,0;30,0;400",
    "2;29.04.2026 14:56:46;22,0;40,0;500",
    "3;29.04.2026 15:06:46;24,0;50,0;600",
  ]);

  const result = parseInneklimaCsv(csv);

  assert.deepEqual(
    {
      min: result.stats.temperature.min,
      max: result.stats.temperature.max,
      avg: result.stats.temperature.avg,
    },
    { min: 20, max: 24, avg: 22 },
  );
  assert.deepEqual(
    {
      min: result.stats.humidity.min,
      max: result.stats.humidity.max,
      avg: result.stats.humidity.avg,
    },
    { min: 30, max: 50, avg: 40 },
  );
  assert.deepEqual(
    {
      min: result.stats.co2.min,
      max: result.stats.co2.max,
      avg: result.stats.co2.avg,
    },
    { min: 400, max: 600, avg: 500 },
  );
});

test("works without the sep=; hint line", () => {
  const csv = buildCsv(
    [
      "1;29.04.2026 14:46:46;21,0;25,0;450",
      "2;29.04.2026 14:56:46;21,5;25,5;455",
    ],
    { sepHint: false },
  );

  const result = parseInneklimaCsv(csv);
  assert.equal(result.samples.length, 2);
  assert.equal(result.stats.temperature.min, 21);
});

test("handles missing channels (no CO2 column)", () => {
  const header = "Indeks;Dato;Ch-int1 Temp [°C];Ch-int2 %RH [%RH]";
  const csv = buildCsv(
    ["1;29.04.2026 14:46:46;21,0;25,0", "2;29.04.2026 14:56:46;22,0;30,0"],
    { sepHint: false, header },
  );

  const result = parseInneklimaCsv(csv);
  assert.equal(result.metadata.channels.co2, false);
  assert.equal(result.metadata.channels.temperature, true);
  assert.equal(result.metadata.channels.humidity, true);
  assert.equal(result.stats.co2.count, 0);
  assert.equal(result.stats.co2.min, null);
  assert.equal(result.stats.temperature.count, 2);
});

test("recognises columns regardless of order", () => {
  const header = "Dato;Ch-int1 CO2 [ppm];Ch-int2 Temp [°C];Ch-int3 %RH [%RH]";
  const csv = buildCsv(
    ["29.04.2026 14:46:46;500;21,0;25,0", "29.04.2026 14:56:46;520;22,0;26,0"],
    { sepHint: false, header },
  );

  const result = parseInneklimaCsv(csv);
  assert.equal(result.samples[0].temperatureC, 21);
  assert.equal(result.samples[0].co2Ppm, 500);
  assert.equal(result.samples[0].relativeHumidity, 25);
});

test("skips rows with invalid dates and records a warning", () => {
  const csv = buildCsv([
    "1;29.04.2026 14:46:46;21,0;25,0;450",
    "2;ikke-en-dato;22,0;26,0;460",
    "3;29.04.2026 15:06:46;21,5;25,5;455",
  ]);

  const result = parseInneklimaCsv(csv);
  assert.equal(result.samples.length, 2);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].message, /Ugyldig dato/);
});

test("decodes ISO-8859-1 bytes (the ° degree symbol round-trips correctly via header detection)", () => {
  const csvText = buildCsv(["1;29.04.2026 14:46:46;21,0;25,0;450"]);
  // Encode as ISO-8859-1 (single byte for °).
  const buffer = new Uint8Array(csvText.length);
  for (let i = 0; i < csvText.length; i += 1) {
    buffer[i] = csvText.charCodeAt(i) & 0xff;
  }

  const result = parseInneklimaCsvBytes(buffer);
  assert.equal(result.samples.length, 1);
  assert.equal(result.samples[0].temperatureC, 21);
});

test("decodes UTF-8 bytes with BOM", () => {
  const csvText = buildCsv(["1;29.04.2026 14:46:46;21,0;25,0;450"]);
  const utf8 = new TextEncoder().encode(csvText);
  const withBom = new Uint8Array(utf8.length + 3);
  withBom[0] = 0xef;
  withBom[1] = 0xbb;
  withBom[2] = 0xbf;
  withBom.set(utf8, 3);

  const result = parseInneklimaCsvBytes(withBom);
  assert.equal(result.samples.length, 1);
  assert.equal(result.samples[0].temperatureC, 21);
});

test("returns an empty result for empty input", () => {
  const result = parseInneklimaCsv("");
  assert.equal(result.samples.length, 0);
  assert.equal(result.metadata.sampleCount, 0);
  assert.equal(result.metadata.startTime, null);
  assert.equal(result.stats.temperature.min, null);
});

test("metadata.startTime/endTime/durationMs match the first and last sample", () => {
  const csv = buildCsv([
    "1;29.04.2026 14:46:46;21,0;25,0;450",
    "2;29.04.2026 14:56:46;21,5;25,5;455",
    "3;29.04.2026 15:06:46;22,0;26,0;460",
  ]);

  const result = parseInneklimaCsv(csv);
  assert.equal(result.metadata.startTime?.toISOString(), new Date(2026, 3, 29, 14, 46, 46).toISOString());
  assert.equal(result.metadata.endTime?.toISOString(), new Date(2026, 3, 29, 15, 6, 46).toISOString());
  assert.equal(result.metadata.durationMs, 20 * 60 * 1000);
});

test("identifies the median sampling interval even with one gap", () => {
  // Three normal 10-minute intervals plus one 30-minute gap (device paused).
  const csv = buildCsv([
    "1;29.04.2026 14:00:00;21,0;25,0;450",
    "2;29.04.2026 14:10:00;21,1;25,1;451",
    "3;29.04.2026 14:20:00;21,2;25,2;452",
    "4;29.04.2026 14:50:00;21,3;25,3;453", // 30-min gap
    "5;29.04.2026 15:00:00;21,4;25,4;454",
  ]);

  const result = parseInneklimaCsv(csv);
  assert.equal(result.metadata.intervalSeconds, 600);
});
