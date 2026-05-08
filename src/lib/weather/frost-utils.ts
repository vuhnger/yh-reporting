import type { IndoorClimateWeatherHour } from "../reports/templates/indoor-climate/schema";

export interface HourBucket {
  date: string;
  hour: number;
  timeLabel: string;
  temperatureValues: number[];
  humidityValues: number[];
  precipitationSum: number;
  hasPrecipitation: boolean;
  windValues: number[];
  gustValues: number[];
  snowDepthValues: number[];
}

export type WeatherGroupKey = "temperature" | "humidity" | "wind" | "precipitation" | "snow";

export interface FrostSourceSelection {
  sourceId: string;
  sourceName: string;
}

export interface FrostSourceCandidate extends FrostSourceSelection {
  normalizedSourceId: string;
}

export const WEATHER_GROUP_LABELS: Record<WeatherGroupKey, string> = {
  temperature: "Temperatur",
  humidity: "Relativ luftfuktighet",
  wind: "Vind",
  precipitation: "Nedbør",
  snow: "Snødybde",
};

export const PRIMARY_WEATHER_GROUPS: WeatherGroupKey[] = ["temperature", "humidity", "precipitation"];

/**
 * Enumerate every YYYY-MM-DD between dateFrom and dateTo (inclusive). Returns
 * an empty array on invalid input, reversed range, or ranges longer than the
 * 31-day safety cap — callers treat empty as "reject the request" and surface
 * a 400 to the user rather than silently truncating.
 */
export function enumerateDates(dateFrom: string, dateTo: string): string[] {
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];
  const dayMs = 24 * 60 * 60 * 1000;
  const span = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  if (span > 31) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < span; i += 1) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getOsloDateHour(referenceTime: string): { date: string; hour: number; timeLabel: string } | null {
  const date = new Date(referenceTime);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hourRaw = parts.find((part) => part.type === "hour")?.value;

  if (!year || !month || !day || hourRaw === undefined) return null;
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return null;

  return {
    date: `${year}-${month}-${day}`,
    hour,
    timeLabel: `${String(hour).padStart(2, "0")}:00`,
  };
}

export function normalizeSourceId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split(":")[0].trim().toUpperCase();
}

export function elementIdToWeatherGroup(elementId: string): WeatherGroupKey | null {
  if (elementId.includes("air_temperature")) return "temperature";
  if (elementId.includes("relative_humidity")) return "humidity";
  if (elementId.includes("precipitation_amount")) return "precipitation";
  if (elementId.includes("wind_speed_of_gust") || elementId === "wind_speed") return "wind";
  if (elementId.includes("surface_snow_thickness")) return "snow";
  return null;
}

function extractObservationSourceId(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;

  const sourceIdValue = (entry as { sourceId?: unknown }).sourceId;
  if (typeof sourceIdValue === "string") {
    const normalized = normalizeSourceId(sourceIdValue);
    if (normalized) return normalized;
  }

  const sourceValue = (entry as { source?: unknown }).source;
  if (typeof sourceValue === "string") {
    const normalized = normalizeSourceId(sourceValue);
    if (normalized) return normalized;
  }

  return null;
}

export function describeWeather(
  avgTempC: number | null,
  precipitationMm: number | null,
  maxWindMs: number | null,
  snowDepthCm: number | null
): { emoji: string; description: string } {
  const precip = precipitationMm ?? 0;
  const wind = maxWindMs ?? 0;
  const snow = snowDepthCm ?? 0;
  const temp = avgTempC ?? 0;

  if (snow > 0 && temp <= 0) return { emoji: "❄️", description: "Snøpreg" };
  if (precip >= 10) return { emoji: "🌧️", description: "Regnfullt" };
  if (wind >= 12) return { emoji: "💨", description: "Vindfullt" };
  if (precip > 0) return { emoji: "🌦️", description: "Byger" };
  if (temp >= 20) return { emoji: "☀️", description: "Varmt og tørt" };
  if (temp <= -5) return { emoji: "🥶", description: "Kaldt" };
  return { emoji: "⛅", description: "Opphold" };
}

export function buildSourceSummaryByGroup(sources: Record<WeatherGroupKey, FrostSourceSelection>): string {
  const unique = new Map<string, string>();
  for (const group of Object.values(sources)) {
    unique.set(group.sourceId, group.sourceName);
  }

  if (unique.size === 1) {
    return Array.from(unique.values())[0] ?? "-";
  }

  return [
    `Temp: ${sources.temperature.sourceName}`,
    `RH: ${sources.humidity.sourceName}`,
    `Vind: ${sources.wind.sourceName}`,
    `Nedbør: ${sources.precipitation.sourceName}`,
    `Snø: ${sources.snow.sourceName}`,
  ].join(" · ");
}

function extractHttpStatusCode(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = Number(message.match(/Request failed \((\d+)\)/)?.[1] ?? "");
  return Number.isFinite(statusCode) && statusCode > 0 ? statusCode : null;
}

function collectObservationMetricsFromPayload(
  payload: unknown,
  dates: ReadonlySet<string>,
  accumulator: {
    temps: number[];
    humidity: number[];
    wind: number[];
    gust: number[];
    precipitationDaily: number[];
    precipitationRaw: number[];
    snowDepth: number[];
    buckets: Map<string, HourBucket>;
  },
  allowedSourceIds: Set<string>
): void {
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return;

  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const sourceId = extractObservationSourceId(entry);
    if (!sourceId || !allowedSourceIds.has(sourceId)) continue;

    const reference = (entry as { referenceTime?: unknown }).referenceTime;
    if (typeof reference !== "string") continue;
    const slot = getOsloDateHour(reference);
    if (!slot || !dates.has(slot.date)) continue;

    const observations = (entry as { observations?: unknown }).observations;
    if (!Array.isArray(observations)) continue;

    const ensureBucket = (): HourBucket => {
      const key = `${slot.date}-${slot.hour}`;
      let bucket = accumulator.buckets.get(key);
      if (!bucket) {
        bucket = {
          date: slot.date,
          hour: slot.hour,
          timeLabel: slot.timeLabel,
          temperatureValues: [],
          humidityValues: [],
          precipitationSum: 0,
          hasPrecipitation: false,
          windValues: [],
          gustValues: [],
          snowDepthValues: [],
        };
        accumulator.buckets.set(key, bucket);
      }
      return bucket;
    };

    for (const obs of observations) {
      if (!obs || typeof obs !== "object") continue;
      const elementId = (obs as { elementId?: unknown }).elementId;
      const value = toNumber((obs as { value?: unknown }).value);
      if (typeof elementId !== "string" || value === null) continue;

      if (elementId.includes("air_temperature")) {
        accumulator.temps.push(value);
        ensureBucket().temperatureValues.push(value);
        continue;
      }
      if (elementId.includes("relative_humidity")) {
        accumulator.humidity.push(value);
        ensureBucket().humidityValues.push(value);
        continue;
      }
      if (elementId === "wind_speed") {
        accumulator.wind.push(value);
        ensureBucket().windValues.push(value);
        continue;
      }
      if (elementId.includes("wind_speed_of_gust")) {
        accumulator.gust.push(value);
        ensureBucket().gustValues.push(value);
        continue;
      }
      if (elementId.includes("sum(precipitation_amount P1D)")) {
        accumulator.precipitationDaily.push(value);
        continue;
      }
      if (elementId === "precipitation_amount") {
        accumulator.precipitationRaw.push(value);
        const bucket = ensureBucket();
        bucket.precipitationSum += value;
        bucket.hasPrecipitation = true;
        continue;
      }
      if (elementId.includes("surface_snow_thickness")) {
        accumulator.snowDepth.push(value);
        ensureBucket().snowDepthValues.push(value);
      }
    }
  }
}

export function pickBestCombinedSource(
  candidates: FrostSourceCandidate[],
  payload: unknown,
  dates: ReadonlySet<string>,
  requiredGroups: WeatherGroupKey[]
): FrostSourceCandidate | null {
  if (candidates.length === 0) return null;

  const data = (payload as { data?: unknown }).data;
  const grouped = new Map<string, Set<WeatherGroupKey>>();
  const valueCounts = new Map<string, number>();

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;
      const sourceId = extractObservationSourceId(entry);
      if (!sourceId) continue;

      const reference = (entry as { referenceTime?: unknown }).referenceTime;
      if (typeof reference !== "string") continue;
      const slot = getOsloDateHour(reference);
      if (!slot || !dates.has(slot.date)) continue;

      const observations = (entry as { observations?: unknown }).observations;
      if (!Array.isArray(observations)) continue;

      for (const obs of observations) {
        if (!obs || typeof obs !== "object") continue;
        const elementId = (obs as { elementId?: unknown }).elementId;
        const value = toNumber((obs as { value?: unknown }).value);
        if (typeof elementId !== "string" || value === null) continue;

        const group = elementIdToWeatherGroup(elementId);
        if (!group) continue;

        let set = grouped.get(sourceId);
        if (!set) {
          set = new Set<WeatherGroupKey>();
          grouped.set(sourceId, set);
        }
        set.add(group);
        valueCounts.set(sourceId, (valueCounts.get(sourceId) ?? 0) + 1);
      }
    }
  }

  for (const candidate of candidates) {
    const groups = grouped.get(candidate.normalizedSourceId);
    if (!groups) continue;
    const hasAllRequired = requiredGroups.every((group) => groups.has(group));
    if (hasAllRequired && (valueCounts.get(candidate.normalizedSourceId) ?? 0) > 0) {
      return candidate;
    }
  }

  return null;
}

export function getObservationSnapshot(
  groupPayloads: Record<WeatherGroupKey, { payload: unknown; source: FrostSourceCandidate }>,
  dates: ReadonlySet<string>
): {
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  maxRelativeHumidity: number | null;
  minRelativeHumidity: number | null;
  avgRelativeHumidity: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  avgWindMs: number | null;
  maxWindMs: number | null;
  hourly: IndoorClimateWeatherHour[];
} {
  const accumulator = {
    temps: [] as number[],
    humidity: [] as number[],
    wind: [] as number[],
    gust: [] as number[],
    precipitationDaily: [] as number[],
    precipitationRaw: [] as number[],
    snowDepth: [] as number[],
    buckets: new Map<string, HourBucket>(),
  };

  collectObservationMetricsFromPayload(groupPayloads.temperature.payload, dates, accumulator, new Set([groupPayloads.temperature.source.normalizedSourceId]));
  collectObservationMetricsFromPayload(groupPayloads.humidity.payload, dates, accumulator, new Set([groupPayloads.humidity.source.normalizedSourceId]));
  collectObservationMetricsFromPayload(groupPayloads.wind.payload, dates, accumulator, new Set([groupPayloads.wind.source.normalizedSourceId]));
  collectObservationMetricsFromPayload(groupPayloads.precipitation.payload, dates, accumulator, new Set([groupPayloads.precipitation.source.normalizedSourceId]));
  collectObservationMetricsFromPayload(groupPayloads.snow.payload, dates, accumulator, new Set([groupPayloads.snow.source.normalizedSourceId]));

  // Sort by date first, then hour, so multi-day reports render chronologically.
  const hourly = Array.from(accumulator.buckets.values())
    .sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date < b.date ? -1 : 1))
    .map<IndoorClimateWeatherHour>((bucket) => {
      const temperatureC = average(bucket.temperatureValues);
      const relativeHumidity = average(bucket.humidityValues);
      const precipitationMm = bucket.hasPrecipitation ? bucket.precipitationSum : null;
      const windMs = average(bucket.windValues);
      const maxWindMs = [...bucket.windValues, ...bucket.gustValues].length > 0 ? Math.max(...bucket.windValues, ...bucket.gustValues) : null;
      const snowDepthCm = bucket.snowDepthValues.length > 0 ? bucket.snowDepthValues[bucket.snowDepthValues.length - 1] : null;
      const hourlyWeather = describeWeather(temperatureC, precipitationMm, maxWindMs, snowDepthCm);

      return {
        date: bucket.date,
        hour: bucket.hour,
        timeLabel: bucket.timeLabel,
        weatherEmoji: hourlyWeather.emoji,
        weatherDescription: hourlyWeather.description,
        temperatureC,
        relativeHumidity,
        precipitationMm,
        windMs,
        maxWindMs,
        snowDepthCm,
      };
    });

  const hourlyPrecipSum = hourly
    .map((row) => row.precipitationMm)
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);
  const hasHourlyPrecip = hourly.some((row) => row.precipitationMm !== null);

  const precipitationMm =
    accumulator.precipitationDaily.length > 0
      ? accumulator.precipitationDaily[accumulator.precipitationDaily.length - 1]
      : hasHourlyPrecip
        ? hourlyPrecipSum
        : accumulator.precipitationRaw.length > 0
          ? accumulator.precipitationRaw.reduce((sum, value) => sum + value, 0)
          : null;

  const combinedWindMaxCandidates = [...accumulator.wind, ...accumulator.gust];

  return {
    maxTempC: accumulator.temps.length > 0 ? Math.max(...accumulator.temps) : null,
    minTempC: accumulator.temps.length > 0 ? Math.min(...accumulator.temps) : null,
    avgTempC: average(accumulator.temps),
    maxRelativeHumidity: accumulator.humidity.length > 0 ? Math.max(...accumulator.humidity) : null,
    minRelativeHumidity: accumulator.humidity.length > 0 ? Math.min(...accumulator.humidity) : null,
    avgRelativeHumidity: average(accumulator.humidity),
    precipitationMm,
    snowDepthCm: accumulator.snowDepth.length > 0 ? accumulator.snowDepth[accumulator.snowDepth.length - 1] : null,
    avgWindMs: average(accumulator.wind),
    maxWindMs: combinedWindMaxCandidates.length > 0 ? Math.max(...combinedWindMaxCandidates) : null,
    hourly,
  };
}

export function hasAnyObservationData(observation: {
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  maxRelativeHumidity: number | null;
  minRelativeHumidity: number | null;
  avgRelativeHumidity: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  avgWindMs: number | null;
  maxWindMs: number | null;
  hourly: IndoorClimateWeatherHour[];
}): boolean {
  if (observation.hourly.length > 0) return true;

  return [
    observation.maxTempC,
    observation.minTempC,
    observation.avgTempC,
    observation.maxRelativeHumidity,
    observation.minRelativeHumidity,
    observation.avgRelativeHumidity,
    observation.precipitationMm,
    observation.snowDepthCm,
    observation.avgWindMs,
    observation.maxWindMs,
  ].some((value) => value !== null);
}

export function buildObservationWarning(group: WeatherGroupKey, error: unknown): string {
  const label = WEATHER_GROUP_LABELS[group];
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = extractHttpStatusCode(error);
  const statusCodeValue = statusCode ?? 0;
  const reason =
    message.match(/"reason"\s*:\s*"([^"]+)"/)?.[1]?.trim() ??
    message.match(/"message"\s*:\s*"([^"]+)"/)?.[1]?.trim() ??
    "";

  if (statusCodeValue === 429) {
    return `${label}: Frost svarte 429 (for mange forespørsler). Prøv igjen om litt.`;
  }
  if (statusCodeValue === 500) {
    return `${label}: Frost svarte 500 (intern feil hos datakilde).`;
  }
  if (statusCodeValue > 0 && reason) {
    return `${label}: Kunne ikke hente data (${statusCodeValue}). ${reason}`;
  }
  if (statusCodeValue > 0) {
    return `${label}: Kunne ikke hente data (${statusCodeValue}).`;
  }
  return `${label}: Kunne ikke hente data fra Frost.`;
}

export function shouldRetryObservationFetch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out/i.test(message)) return true;
  const statusCode = extractHttpStatusCode(error);
  return statusCode === 429 || statusCode === 500 || statusCode === 502 || statusCode === 503 || statusCode === 504;
}
