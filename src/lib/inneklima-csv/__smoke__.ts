// Manual smoke test against a real Kimo Kistock export. Not part of CI.
// Run with: node --experimental-strip-types src/lib/inneklima-csv/__smoke__.ts
import { readFileSync } from "node:fs";
// @ts-expect-error explicit .ts extension required by node --experimental-strip-types
import { parseInneklimaCsvBytes } from "./parser.ts";

const path =
  process.argv[2] ??
  "/Users/victor.uhnger/Documents/DrD_BHT/YH/Rapportmateriale/PPOP kontroll-2-451.csv";

const bytes = readFileSync(path);
const result = parseInneklimaCsvBytes(bytes);

const fmt = (n: number | null, d = 1) => (n === null ? "—" : n.toFixed(d));
const fileName = path.split("/").pop() ?? path;

console.log("File:", fileName);
console.log("Channels:", result.metadata.channels);
console.log("Samples:", result.metadata.sampleCount);
console.log(
  "Period:",
  result.metadata.startTime?.toISOString(),
  "→",
  result.metadata.endTime?.toISOString(),
);
console.log(
  "Duration:",
  result.metadata.durationMs
    ? `${(result.metadata.durationMs / (1000 * 3600 * 24)).toFixed(2)} days`
    : "n/a",
);
console.log(
  "Interval:",
  `${result.metadata.intervalSeconds} s (${(result.metadata.intervalSeconds ?? 0) / 60} min)`,
);
console.log();
console.log("Stats:");
const { temperature, humidity, co2 } = result.stats;
console.log(
  `  Temperature  min=${fmt(temperature.min)} max=${fmt(temperature.max)} avg=${fmt(temperature.avg)} °C   (n=${temperature.count})`,
);
console.log(
  `  Humidity     min=${fmt(humidity.min)} max=${fmt(humidity.max)} avg=${fmt(humidity.avg)} %RH (n=${humidity.count})`,
);
console.log(
  `  CO2          min=${fmt(co2.min, 0)} max=${fmt(co2.max, 0)} avg=${fmt(co2.avg, 0)} ppm  (n=${co2.count})`,
);
console.log();
console.log("Warnings:", result.warnings.length);
if (result.warnings.length > 0) console.log(result.warnings.slice(0, 5));
