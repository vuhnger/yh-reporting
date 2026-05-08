// Rounding helpers used when feeding parsed CSV stats into UI inputs and reports.
// Kept separate from `parser.ts` so the parser stays raw/lossless.

import type { MetricStats } from "./parser";

export interface RoundedStats {
  min: number | null;
  max: number | null;
  avg: number | null;
}

/**
 * Round each of {min, max, avg} to a fixed number of decimals, preserving null.
 *
 * Display conventions used in existing reports (verified against the avarn
 * Hammerfest report and DSV Vestby report):
 *   - Temperature: 1 decimal (e.g. 21.5 °C)
 *   - Relative humidity: 1 decimal in tables, 2 in prose; we use 1 here
 *   - CO2: 0 decimals (whole ppm)
 */
export function roundMetricStats(stats: MetricStats, decimals: number): RoundedStats {
  const factor = 10 ** decimals;
  const round = (value: number | null): number | null =>
    value === null ? null : Math.round(value * factor) / factor;
  return {
    min: round(stats.min),
    max: round(stats.max),
    avg: round(stats.avg),
  };
}
