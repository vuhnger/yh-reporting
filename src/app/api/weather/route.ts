import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type {
  IndoorClimateWeatherHour,
  IndoorClimateWeatherSnapshot,
} from "@/lib/reports/templates/indoor-climate/schema";

interface KartverketAddress {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  representasjonspunkt?: {
    lat?: number;
    lon?: number;
  };
}

interface KartverketAddressResponse {
  adresser?: KartverketAddress[];
}

interface HourBucket {
  date: string;
  hour: number;
  timeLabel: string;
  temperatureValues: number[];
  precipitationSum: number;
  hasPrecipitation: boolean;
  windValues: number[];
  gustValues: number[];
  snowDepthValues: number[];
}

type WeatherGroupKey = "temperature" | "wind" | "precipitation" | "snow";

interface FrostSourceSelection {
  sourceId: string;
  sourceName: string;
}

interface FrostSourceCandidate extends FrostSourceSelection {
  normalizedSourceId: string;
}

interface ObservationPayloadResult {
  payload: unknown;
  warning: string | null;
}

const WEATHER_GROUP_ELEMENTS: Record<WeatherGroupKey, string[]> = {
  temperature: ["air_temperature"],
  wind: ["wind_speed", "wind_speed_of_gust"],
  precipitation: ["precipitation_amount"],
  snow: ["surface_snow_thickness"],
};

const WEATHER_GROUP_LABELS: Record<WeatherGroupKey, string> = {
  temperature: "Temperatur",
  wind: "Vind",
  precipitation: "Nedbor",
  snow: "Snodybde",
};

const FROST_NEAREST_MAX_COUNT = 20;
const OBSERVATION_SOURCE_LIMIT_BY_GROUP: Record<WeatherGroupKey, number> = {
  temperature: 10,
  wind: 10,
  precipitation: 6,
  snow: 6,
};
const USER_VISIBLE_WEATHER_ERROR = "Kunne ikke hente vaerdata.";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundOne(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
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

  const dateLabel = `${year}-${month}-${day}`;
  return {
    date: dateLabel,
    hour,
    timeLabel: `${String(hour).padStart(2, "0")}:00`,
  };
}

function buildFrostAuth(clientId: string): string {
  return `Basic ${Buffer.from(`${clientId}:`).toString("base64")}`;
}

async function fetchJson<T = unknown>(
  url: string,
  headers: HeadersInit = {},
  timeoutMs = 10_000
): Promise<T> {
  let controller: AbortController | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let signal: AbortSignal;

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    signal = AbortSignal.timeout(timeoutMs);
  } else {
    controller = new AbortController();
    signal = controller.signal;
    timeoutHandle = setTimeout(() => controller?.abort(), timeoutMs);
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...headers,
      },
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Request failed (${response.status}): ${body || response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    const isAbortError =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")) ||
      signal.aborted;
    if (isAbortError) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function extractStationName(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
  if (typeof record.shortName === "string" && record.shortName.trim()) return record.shortName.trim();
  return null;
}

function normalizeSourceId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split(":")[0].trim().toUpperCase();
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

function describeWeather(
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

function buildObservationWarning(group: WeatherGroupKey, error: unknown): string {
  const label = WEATHER_GROUP_LABELS[group];
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = Number((message.match(/Request failed \((\d+)\)/)?.[1] ?? ""));
  const reason =
    message.match(/"reason"\s*:\s*"([^"]+)"/)?.[1]?.trim() ??
    message.match(/"message"\s*:\s*"([^"]+)"/)?.[1]?.trim() ??
    "";

  if (statusCode === 429) {
    return `${label}: Frost svarte 429 (for mange foresporsler). Prov igjen om litt.`;
  }
  if (statusCode === 500) {
    return `${label}: Frost svarte 500 (intern feil hos datakilde).`;
  }
  if (statusCode > 0 && reason) {
    return `${label}: Kunne ikke hente data (${statusCode}). ${reason}`;
  }
  if (statusCode > 0) {
    return `${label}: Kunne ikke hente data (${statusCode}).`;
  }
  return `${label}: Kunne ikke hente data fra Frost.`;
}

async function geocodeNorwegianAddress(address: string): Promise<{ lat: number; lon: number }> {
  const url =
    `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(address)}` +
    "&fuzzy=true&treffPerSide=1";
  const payload = await fetchJson<KartverketAddressResponse>(url);
  const first = Array.isArray(payload.adresser) ? payload.adresser[0] : null;
  if (!first) {
    throw new Error("Fant ikke adresse i Kartverket.");
  }

  const lat = toNumber(first.representasjonspunkt?.lat);
  const lon = toNumber(first.representasjonspunkt?.lon);

  if (lat === null || lon === null) {
    throw new Error("Fant ikke koordinater for valgt adresse.");
  }

  return { lat, lon };
}

async function getNearestFrostSourceForElements(
  lat: number,
  lon: number,
  elements: string[],
  frostAuth: string
): Promise<FrostSourceCandidate[]> {
  const geometry = encodeURIComponent(`nearest(POINT(${lon} ${lat}))`);
  const encodedElements = encodeURIComponent(elements.join(","));
  const url =
    `https://frost.met.no/sources/v0.jsonld?geometry=${geometry}` +
    `&elements=${encodedElements}&nearestmaxcount=${FROST_NEAREST_MAX_COUNT}` +
    "&types=SensorSystem&country=NO";
  const payload = await fetchJson<{ data?: unknown }>(url, {
    Authorization: frostAuth,
  });
  const rows = Array.isArray(payload.data) ? payload.data : [];
  if (rows.length === 0) {
    throw new Error("Fant ingen naerliggende vaerstasjon.");
  }

  const candidates: FrostSourceCandidate[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const sourceId = String((row as { id?: unknown }).id ?? "").trim();
    if (!sourceId) continue;
    const normalizedSourceId = normalizeSourceId(sourceId);
    if (!normalizedSourceId) continue;

    candidates.push({
      sourceId,
      normalizedSourceId,
      sourceName: extractStationName(row) ?? sourceId,
    });
  }

  if (candidates.length === 0) {
    throw new Error("Fant ingen gyldige vaerstasjoner fra Frost.");
  }

  return candidates;
}

function collectObservationMetricsFromPayload(
  payload: unknown,
  date: string,
  accumulator: {
    temps: number[];
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
    if (!slot || slot.date !== date) continue;

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
        continue;
      }
    }
  }
}

async function getObservationPayload(
  group: WeatherGroupKey,
  sourceIds: string[],
  date: string,
  elements: string[],
  frostAuth: string
): Promise<ObservationPayloadResult> {
  if (sourceIds.length === 0) {
    return { payload: { data: [] }, warning: `${WEATHER_GROUP_LABELS[group]}: Ingen stasjonskandidater.` };
  }

  const referenceTime = `${date}T00:00:00Z/${date}T23:59:59Z`;
  const url =
    `https://frost.met.no/observations/v0.jsonld?sources=${encodeURIComponent(sourceIds.join(","))}` +
    `&referencetime=${encodeURIComponent(referenceTime)}` +
    `&elements=${encodeURIComponent(elements.join(","))}`;

  try {
    return {
      payload: await fetchJson(url, {
        Authorization: frostAuth,
      }),
      warning: null,
    };
  } catch (error) {
    const warning = buildObservationWarning(group, error);
    console.warn("Weather observation fetch failed", {
      group,
      sourceCount: sourceIds.length,
      elements: elements.join(","),
      warning,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      payload: { data: [] },
      warning,
    };
  }
}

function pickNearestSourceWithData(
  candidates: FrostSourceCandidate[],
  payload: unknown,
  date: string
): FrostSourceCandidate {
  if (candidates.length === 0) {
    throw new Error("Fant ingen kandidater for vaerstasjon.");
  }

  const counts = new Map<string, number>();
  const data = (payload as { data?: unknown }).data;

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;

      const sourceId = extractObservationSourceId(entry);
      if (!sourceId) continue;

      const reference = (entry as { referenceTime?: unknown }).referenceTime;
      if (typeof reference !== "string") continue;

      const slot = getOsloDateHour(reference);
      if (!slot || slot.date !== date) continue;

      const observations = (entry as { observations?: unknown }).observations;
      if (!Array.isArray(observations)) continue;

      const validValues = observations.reduce((sum, obs) => {
        if (!obs || typeof obs !== "object") return sum;
        const value = toNumber((obs as { value?: unknown }).value);
        return value === null ? sum : sum + 1;
      }, 0);

      if (validValues > 0) {
        counts.set(sourceId, (counts.get(sourceId) ?? 0) + validValues);
      }
    }
  }

  for (const candidate of candidates) {
    if ((counts.get(candidate.normalizedSourceId) ?? 0) > 0) {
      return candidate;
    }
  }

  return candidates[0];
}

function buildSourceSummaryByGroup(sources: Record<WeatherGroupKey, FrostSourceSelection>): string {
  const unique = new Map<string, string>();
  for (const group of Object.values(sources)) {
    unique.set(group.sourceId, group.sourceName);
  }

  if (unique.size === 1) {
    return Array.from(unique.values())[0] ?? "-";
  }

  return [
    `Temp: ${sources.temperature.sourceName}`,
    `Vind: ${sources.wind.sourceName}`,
    `Nedbor: ${sources.precipitation.sourceName}`,
    `Sno: ${sources.snow.sourceName}`,
  ].join(" · ");
}

type GroupObservationPayloads = Record<
  WeatherGroupKey,
  { payload: unknown; source: FrostSourceCandidate }
>;

function getObservationSnapshot(
  groupPayloads: GroupObservationPayloads,
  date: string
): {
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  avgWindMs: number | null;
  maxWindMs: number | null;
  hourly: IndoorClimateWeatherHour[];
} {

  const accumulator = {
    temps: [] as number[],
    wind: [] as number[],
    gust: [] as number[],
    precipitationDaily: [] as number[],
    precipitationRaw: [] as number[],
    snowDepth: [] as number[],
    buckets: new Map<string, HourBucket>(),
  };

  collectObservationMetricsFromPayload(
    groupPayloads.temperature.payload,
    date,
    accumulator,
    new Set([groupPayloads.temperature.source.normalizedSourceId])
  );
  collectObservationMetricsFromPayload(
    groupPayloads.wind.payload,
    date,
    accumulator,
    new Set([groupPayloads.wind.source.normalizedSourceId])
  );
  collectObservationMetricsFromPayload(
    groupPayloads.precipitation.payload,
    date,
    accumulator,
    new Set([groupPayloads.precipitation.source.normalizedSourceId])
  );
  collectObservationMetricsFromPayload(
    groupPayloads.snow.payload,
    date,
    accumulator,
    new Set([groupPayloads.snow.source.normalizedSourceId])
  );

  const hourly = Array.from(accumulator.buckets.values())
    .sort((a, b) => a.hour - b.hour)
    .map<IndoorClimateWeatherHour>((bucket) => {
      const temperatureC = average(bucket.temperatureValues);
      const precipitationMm = bucket.hasPrecipitation ? bucket.precipitationSum : null;
      const windMs = average(bucket.windValues);
      const maxWindMs =
        [...bucket.windValues, ...bucket.gustValues].length > 0
          ? Math.max(...bucket.windValues, ...bucket.gustValues)
          : null;
      const snowDepthCm =
        bucket.snowDepthValues.length > 0
          ? bucket.snowDepthValues[bucket.snowDepthValues.length - 1]
          : null;
      const hourlyWeather = describeWeather(
        temperatureC,
        precipitationMm,
        maxWindMs,
        snowDepthCm
      );

      return {
        date: bucket.date,
        hour: bucket.hour,
        timeLabel: bucket.timeLabel,
        weatherEmoji: hourlyWeather.emoji,
        weatherDescription: hourlyWeather.description,
        temperatureC,
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
    precipitationMm,
    snowDepthCm:
      accumulator.snowDepth.length > 0
        ? accumulator.snowDepth[accumulator.snowDepth.length - 1]
        : null,
    avgWindMs: average(accumulator.wind),
    maxWindMs:
      combinedWindMaxCandidates.length > 0 ? Math.max(...combinedWindMaxCandidates) : null,
    hourly,
  };
}

function hasAnyObservationData(observation: {
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
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
    observation.precipitationMm,
    observation.snowDepthCm,
    observation.avgWindMs,
    observation.maxWindMs,
  ].some((value) => value !== null);
}

async function getClimateNormalTemperature(
  sourceId: string,
  date: string,
  frostAuth: string
): Promise<number | null> {
  const month = date.slice(0, 7);
  const elements = encodeURIComponent("mean(air_temperature P1M)");
  const url =
    `https://frost.met.no/climatenormals/v0.jsonld?sources=${encodeURIComponent(sourceId)}` +
    `&referencetime=${encodeURIComponent(month)}&elements=${elements}`;

  try {
    const payload = await fetchJson<{ data?: unknown }>(url, { Authorization: frostAuth });
    const rows = Array.isArray(payload.data) ? payload.data : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const value = toNumber((row as { value?: unknown }).value);
      if (value !== null) return value;
      const obsValue = toNumber((row as { observations?: Array<{ value?: unknown }> }).observations?.[0]?.value);
      if (obsValue !== null) return obsValue;
    }
  } catch {
    return null;
  }

  return null;
}

function validateDateString(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const constructed = new Date(year, month - 1, day);
  return (
    constructed.getFullYear() === year &&
    constructed.getMonth() === month - 1 &&
    constructed.getDate() === day
  );
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const address = (url.searchParams.get("address") || "").trim();
    const date = (url.searchParams.get("date") || "").trim();
    const latParam = toNumber(url.searchParams.get("lat"));
    const lonParam = toNumber(url.searchParams.get("lon"));

    if (!address) {
      return NextResponse.json({ error: "Adresse mangler." }, { status: 400 });
    }
    if (!date || !validateDateString(date)) {
      return NextResponse.json({ error: "Ugyldig dato. Bruk YYYY-MM-DD." }, { status: 400 });
    }

    const frostClientId = process.env.MET_FROST_CLIENT_ID;
    if (!frostClientId) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    const frostAuth = buildFrostAuth(frostClientId);
    const coordinates =
      latParam !== null && lonParam !== null && isValidCoordinate(latParam, lonParam)
        ? { lat: latParam, lon: lonParam }
        : await geocodeNorwegianAddress(address);
    const { lat, lon } = coordinates;
    const temperatureCandidates = await getNearestFrostSourceForElements(
      lat,
      lon,
      WEATHER_GROUP_ELEMENTS.temperature,
      frostAuth
    );
    const [windCandidates, precipitationCandidates, snowCandidates] = await Promise.all([
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.wind, frostAuth).catch(
        () => temperatureCandidates
      ),
      getNearestFrostSourceForElements(
        lat,
        lon,
        WEATHER_GROUP_ELEMENTS.precipitation,
        frostAuth
      ).catch(() => temperatureCandidates),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.snow, frostAuth).catch(
        () => temperatureCandidates
      ),
    ]);

    const [temperatureResult, windResult, precipitationResult, snowResult] =
      await Promise.all([
        getObservationPayload(
          "temperature",
          temperatureCandidates
            .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.temperature)
            .map((candidate) => candidate.sourceId),
          date,
          WEATHER_GROUP_ELEMENTS.temperature,
          frostAuth
        ),
        getObservationPayload(
          "wind",
          windCandidates
            .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.wind)
            .map((candidate) => candidate.sourceId),
          date,
          WEATHER_GROUP_ELEMENTS.wind,
          frostAuth
        ),
        getObservationPayload(
          "precipitation",
          precipitationCandidates
            .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.precipitation)
            .map((candidate) => candidate.sourceId),
          date,
          WEATHER_GROUP_ELEMENTS.precipitation,
          frostAuth
        ),
        getObservationPayload(
          "snow",
          snowCandidates
            .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.snow)
            .map((candidate) => candidate.sourceId),
          date,
          WEATHER_GROUP_ELEMENTS.snow,
          frostAuth
        ),
      ]);

    const observationWarnings = [
      temperatureResult.warning,
      windResult.warning,
      precipitationResult.warning,
      snowResult.warning,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    const temperatureSource = pickNearestSourceWithData(
      temperatureCandidates,
      temperatureResult.payload,
      date
    );
    const windSource = pickNearestSourceWithData(windCandidates, windResult.payload, date);
    const precipitationSource = pickNearestSourceWithData(
      precipitationCandidates,
      precipitationResult.payload,
      date
    );
    const snowSource = pickNearestSourceWithData(snowCandidates, snowResult.payload, date);

    const selectedSources: Record<WeatherGroupKey, FrostSourceSelection> = {
      temperature: {
        sourceId: temperatureSource.sourceId,
        sourceName: temperatureSource.sourceName,
      },
      wind: {
        sourceId: windSource.sourceId,
        sourceName: windSource.sourceName,
      },
      precipitation: {
        sourceId: precipitationSource.sourceId,
        sourceName: precipitationSource.sourceName,
      },
      snow: {
        sourceId: snowSource.sourceId,
        sourceName: snowSource.sourceName,
      },
    };

    const observation = getObservationSnapshot(
      {
        temperature: { payload: temperatureResult.payload, source: temperatureSource },
        wind: { payload: windResult.payload, source: windSource },
        precipitation: { payload: precipitationResult.payload, source: precipitationSource },
        snow: { payload: snowResult.payload, source: snowSource },
      },
      date
    );
    if (!hasAnyObservationData(observation)) {
      throw new Error(
        observationWarnings[0] ??
          "Kunne ikke hente brukbare observasjoner fra Frost for valgt dato."
      );
    }
    const normalTempC = await getClimateNormalTemperature(
      selectedSources.temperature.sourceId,
      date,
      frostAuth
    );
    const sourceName = buildSourceSummaryByGroup(selectedSources);
    const weatherDescription = describeWeather(
      observation.avgTempC,
      observation.precipitationMm,
      observation.maxWindMs,
      observation.snowDepthCm
    );

    const snapshot: IndoorClimateWeatherSnapshot = {
      address,
      date,
      sourceName,
      weatherEmoji: weatherDescription.emoji,
      weatherDescription: weatherDescription.description,
      warnings: observationWarnings,
      maxTempC: roundOne(observation.maxTempC),
      minTempC: roundOne(observation.minTempC),
      avgTempC: roundOne(observation.avgTempC),
      normalTempC: roundOne(normalTempC),
      precipitationMm: roundOne(observation.precipitationMm),
      snowDepthCm: roundOne(observation.snowDepthCm),
      avgWindMs: roundOne(observation.avgWindMs),
      maxWindMs: roundOne(observation.maxWindMs),
      hourly: observation.hourly.map((row) => ({
        ...row,
        temperatureC: roundOne(row.temperatureC),
        precipitationMm: roundOne(row.precipitationMm),
        windMs: roundOne(row.windMs),
        maxWindMs: roundOne(row.maxWindMs),
        snowDepthCm: roundOne(row.snowDepthCm),
      })),
    };

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    console.error("Weather API error:", error);
    const message = error instanceof Error ? error.message : USER_VISIBLE_WEATHER_ERROR;
    return NextResponse.json({ error: message || USER_VISIBLE_WEATHER_ERROR }, { status: 500 });
  }
}
