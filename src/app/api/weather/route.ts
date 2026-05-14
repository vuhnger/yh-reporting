import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  buildObservationWarning,
  buildSourceSummaryByGroup,
  describeWeather,
  enumerateDates,
  getObservationSnapshot,
  hasAnyObservationData,
  normalizeSourceId,
  pickBestCombinedSource,
  PRIMARY_WEATHER_GROUPS,
  shouldRetryObservationFetch,
  WEATHER_GROUP_LABELS,
  type FrostSourceCandidate,
  type FrostSourceSelection,
  type WeatherGroupKey,
} from "@/lib/weather/frost-utils";
import { mapChunksInParallel } from "@/lib/weather/async-utils";
import type {
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

interface ObservationPayloadResult {
  payload: unknown;
  warning: string | null;
}

const WEATHER_GROUP_ELEMENTS: Record<WeatherGroupKey, string[]> = {
  temperature: ["air_temperature"],
  humidity: ["relative_humidity"],
  wind: ["wind_speed", "wind_speed_of_gust"],
  precipitation: ["precipitation_amount"],
  snow: ["surface_snow_thickness"],
};

const FROST_NEAREST_MAX_COUNT = 5;
const OBSERVATION_SOURCE_LIMIT_BY_GROUP: Record<WeatherGroupKey, number> = {
  temperature: 5,
  humidity: 5,
  wind: 5,
  precipitation: 5,
  snow: 5,
};
const OBSERVATION_BATCH_SIZE_BY_GROUP: Record<WeatherGroupKey, number> = {
  temperature: 5,
  humidity: 5,
  wind: 5,
  precipitation: 5,
  snow: 5,
};
const OBSERVATION_FETCH_TIMEOUT_MS = 7_000;
const OBSERVATION_FETCH_RETRY_ATTEMPTS = 2;
const OBSERVATION_FETCH_RETRY_BASE_DELAY_MS = 350;
const USER_VISIBLE_WEATHER_ERROR = "Kunne ikke hente vaerdata.";

function getSafeWeatherErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "safeMessage" in error &&
    typeof (error as { safeMessage?: unknown }).safeMessage === "string"
  ) {
    const safe = (error as { safeMessage: string }).safeMessage.trim();
    if (safe) return safe;
  }
  return USER_VISIBLE_WEATHER_ERROR;
}

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

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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


async function getObservationPayload(
  sourceIds: string[],
  dateFrom: string,
  dateTo: string,
  elements: string[],
  frostAuth: string,
  options: {
    chunkSize: number;
    emptyWarning: string;
    fallbackWarning: string;
    partialWarning: (failedChunks: number, totalChunks: number) => string;
    buildChunkWarning: (error: unknown) => string;
    logLabel: string;
    logContext?: Record<string, unknown>;
  }
): Promise<ObservationPayloadResult> {
  if (sourceIds.length === 0) {
    return { payload: { data: [] }, warning: options.emptyWarning };
  }

  const referenceTime = `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`;
  const mergedData: unknown[] = [];
  const chunkWarnings: string[] = [];
  const chunkCount = Math.ceil(sourceIds.length / Math.max(options.chunkSize, 1));
  const chunkResults = await mapChunksInParallel(sourceIds, options.chunkSize, async (sourceChunk, chunkIndex) => {
    const url =
      `https://frost.met.no/observations/v0.jsonld?sources=${encodeURIComponent(sourceChunk.join(","))}` +
      `&referencetime=${encodeURIComponent(referenceTime)}` +
      `&elements=${encodeURIComponent(elements.join(","))}`;

    let lastError: unknown = null;
    let payload: unknown = null;

    for (let attempt = 1; attempt <= OBSERVATION_FETCH_RETRY_ATTEMPTS; attempt += 1) {
      try {
        payload = await fetchJson(url, { Authorization: frostAuth }, OBSERVATION_FETCH_TIMEOUT_MS);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const retryable = shouldRetryObservationFetch(error);
        if (!retryable || attempt === OBSERVATION_FETCH_RETRY_ATTEMPTS) break;

        const jitterMs = Math.floor(Math.random() * 120);
        const delayMs = OBSERVATION_FETCH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + jitterMs;
        await delay(delayMs);
      }
    }

    if (lastError) {
      const warning = options.buildChunkWarning(lastError);
      console.warn(options.logLabel, {
        chunk: chunkIndex + 1,
        chunkCount,
        sourceCount: sourceChunk.length,
        sources: sourceChunk,
        elements: elements.join(","),
        warning,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        ...options.logContext,
      });
      return { rows: [] as unknown[], warning };
    }

    const rows = Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data)
      : [];
    return { rows, warning: null as string | null };
  });

  for (const result of chunkResults) {
    if (result.warning) chunkWarnings.push(result.warning);
    mergedData.push(...result.rows);
  }

  if (mergedData.length === 0) {
    const warning = chunkWarnings[0] ?? options.fallbackWarning;
    return { payload: { data: [] }, warning };
  }

  if (chunkWarnings.length > 0) {
    return {
      payload: { data: mergedData },
      warning: options.partialWarning(chunkWarnings.length, chunkCount),
    };
  }

  return {
    payload: { data: mergedData },
    warning: null,
  };
}

async function getCombinedObservationPayload(
  sourceIds: string[],
  dateFrom: string,
  dateTo: string,
  elements: string[],
  frostAuth: string
): Promise<ObservationPayloadResult> {
  return getObservationPayload(sourceIds, dateFrom, dateTo, elements, frostAuth, {
    chunkSize: 3,
    emptyWarning: "Komplett værstasjon: Ingen stasjonskandidater.",
    fallbackWarning: "Komplett værstasjon: Kunne ikke hente data fra Frost.",
    partialWarning: (failedChunks, totalChunks) =>
      `Komplett værstasjon: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
    buildChunkWarning: (error) =>
      buildObservationWarning("temperature", error).replace("Temperatur", "Komplett værstasjon"),
    logLabel: "Combined weather observation fetch failed",
  });
}

function pickNearestSourceWithData(
  candidates: FrostSourceCandidate[],
  payload: unknown,
  dates: ReadonlySet<string>
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
      if (!slot || !dates.has(slot.date)) continue;

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
  const startedAtMs = Date.now();
  const timingMarks: Record<string, number> = {};
  const markTiming = (label: string) => {
    timingMarks[label] = Date.now() - startedAtMs;
  };
  const logTimingSummary = (outcome: "success" | "early-exit" | "error", extra: Record<string, unknown> = {}) => {
    console.info("Weather API timing", {
      outcome,
      totalMs: Date.now() - startedAtMs,
      stagesMs: timingMarks,
      ...extra,
    });
  };
  const respondWithLoggedTiming = (
    body: { error: string },
    init: { status: number },
    finalLabel: string,
    extra: Record<string, unknown> = {}
  ) => {
    markTiming(finalLabel);
    logTimingSummary("early-exit", { status: init.status, ...extra });
    return NextResponse.json(body, init);
  };

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return respondWithLoggedTiming({ error: "Unauthorized" }, { status: 401 }, "early-exit-401");
    }

    const url = new URL(request.url);
    const address = (url.searchParams.get("address") || "").trim();
    const dateFromParam = (url.searchParams.get("dateFrom") || "").trim();
    const dateToParam = (url.searchParams.get("dateTo") || "").trim();
    // Backwards compat: if a single `date` is sent, treat as both ends.
    const legacyDate = (url.searchParams.get("date") || "").trim();
    const dateFrom = dateFromParam || legacyDate;
    const dateTo = dateToParam || legacyDate || dateFromParam;
    const latParam = toNumber(url.searchParams.get("lat"));
    const lonParam = toNumber(url.searchParams.get("lon"));

    if (!address) {
      return respondWithLoggedTiming(
        { error: "Adresse mangler." },
        { status: 400 },
        "early-exit-validation-400",
        { reason: "missing-address" }
      );
    }
    if (!dateFrom || !validateDateString(dateFrom)) {
      return respondWithLoggedTiming(
        { error: "Ugyldig dato. Bruk YYYY-MM-DD." },
        { status: 400 },
        "early-exit-validation-400",
        { reason: "invalid-date-from" }
      );
    }
    if (!dateTo || !validateDateString(dateTo)) {
      return respondWithLoggedTiming(
        { error: "Ugyldig dato. Bruk YYYY-MM-DD." },
        { status: 400 },
        "early-exit-validation-400",
        { reason: "invalid-date-to" }
      );
    }
    if (dateTo < dateFrom) {
      return respondWithLoggedTiming(
        { error: "dateTo må være lik eller etter dateFrom." },
        { status: 400 },
        "early-exit-validation-400",
        { reason: "reversed-date-range" }
      );
    }
    const dateList = enumerateDates(dateFrom, dateTo);
    if (dateList.length === 0) {
      return respondWithLoggedTiming(
        { error: "Periode for værdata er ugyldig eller for lang (maks 31 dager)." },
        { status: 400 },
        "early-exit-validation-400",
        { reason: "invalid-or-too-long-range" }
      );
    }
    const dates = new Set(dateList);

    const frostClientId = process.env.MET_FROST_CLIENT_ID;
    if (!frostClientId) {
      return respondWithLoggedTiming(
        { error: "Missing configuration" },
        { status: 500 },
        "early-exit-config-500"
      );
    }

    const frostAuth = buildFrostAuth(frostClientId);
    const coordinates =
      latParam !== null && lonParam !== null && isValidCoordinate(latParam, lonParam)
        ? { lat: latParam, lon: lonParam }
        : await geocodeNorwegianAddress(address);
    markTiming("coordinatesResolvedMs");
    const { lat, lon } = coordinates;
    const [
      primaryStationCandidates,
      temperatureCandidates,
      humidityCandidatesRaw,
      windCandidatesRaw,
      precipitationCandidatesRaw,
      snowCandidatesRaw,
    ] = await Promise.all([
      getNearestFrostSourceForElements(
        lat, lon,
        [...WEATHER_GROUP_ELEMENTS.temperature, ...WEATHER_GROUP_ELEMENTS.humidity, ...WEATHER_GROUP_ELEMENTS.precipitation],
        frostAuth
      ).catch(() => []),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.temperature, frostAuth),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.humidity, frostAuth).catch(() => null),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.wind, frostAuth).catch(() => null),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.precipitation, frostAuth).catch(() => null),
      getNearestFrostSourceForElements(lat, lon, WEATHER_GROUP_ELEMENTS.snow, frostAuth).catch(() => null),
    ]);
    markTiming("sourceCandidatesResolvedMs");
    const humidityCandidates = humidityCandidatesRaw ?? temperatureCandidates;
    const windCandidates = windCandidatesRaw ?? temperatureCandidates;
    const precipitationCandidates = precipitationCandidatesRaw ?? temperatureCandidates;
    const snowCandidates = snowCandidatesRaw ?? temperatureCandidates;

    const combinedPrimaryPromise = getCombinedObservationPayload(
      primaryStationCandidates.slice(0, 6).map((candidate) => candidate.sourceId),
      dateFrom,
      dateTo,
      [
        ...WEATHER_GROUP_ELEMENTS.temperature,
        ...WEATHER_GROUP_ELEMENTS.humidity,
        ...WEATHER_GROUP_ELEMENTS.precipitation,
      ],
      frostAuth
    );
    const windResultPromise = getObservationPayload(
      windCandidates
        .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.wind)
        .map((candidate) => candidate.sourceId),
      dateFrom,
      dateTo,
      WEATHER_GROUP_ELEMENTS.wind,
      frostAuth,
      {
        chunkSize: OBSERVATION_BATCH_SIZE_BY_GROUP.wind,
        emptyWarning: `${WEATHER_GROUP_LABELS.wind}: Ingen stasjonskandidater.`,
        fallbackWarning: `${WEATHER_GROUP_LABELS.wind}: Kunne ikke hente data fra Frost.`,
        partialWarning: (failedChunks, totalChunks) =>
          `${WEATHER_GROUP_LABELS.wind}: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
        buildChunkWarning: (error) => buildObservationWarning("wind", error),
        logLabel: "Weather observation fetch failed",
        logContext: { group: "wind" },
      }
    );
    const snowResultPromise = getObservationPayload(
      snowCandidates
        .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.snow)
        .map((candidate) => candidate.sourceId),
      dateFrom,
      dateTo,
      WEATHER_GROUP_ELEMENTS.snow,
      frostAuth,
      {
        chunkSize: OBSERVATION_BATCH_SIZE_BY_GROUP.snow,
        emptyWarning: `${WEATHER_GROUP_LABELS.snow}: Ingen stasjonskandidater.`,
        fallbackWarning: `${WEATHER_GROUP_LABELS.snow}: Kunne ikke hente data fra Frost.`,
        partialWarning: (failedChunks, totalChunks) =>
          `${WEATHER_GROUP_LABELS.snow}: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
        buildChunkWarning: (error) => buildObservationWarning("snow", error),
        logLabel: "Weather observation fetch failed",
        logContext: { group: "snow" },
      }
    );
    const normalTempPromise = getClimateNormalTemperature(temperatureCandidates[0]?.sourceId ?? "", dateFrom, frostAuth);

    const combinedPrimaryResult = await combinedPrimaryPromise;
    markTiming("combinedPrimaryResolvedMs");

    const completePrimarySource = pickBestCombinedSource(
      primaryStationCandidates,
      combinedPrimaryResult.payload,
      dates,
      PRIMARY_WEATHER_GROUPS
    );

    const [temperatureResult, humidityResult, precipitationResult, windResult, snowResult, normalTempC] =
      await Promise.all([
        completePrimarySource
          ? Promise.resolve({ payload: combinedPrimaryResult.payload, warning: combinedPrimaryResult.warning })
          : getObservationPayload(
              temperatureCandidates
                .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.temperature)
                .map((candidate) => candidate.sourceId),
              dateFrom,
              dateTo,
              WEATHER_GROUP_ELEMENTS.temperature,
              frostAuth,
              {
                chunkSize: OBSERVATION_BATCH_SIZE_BY_GROUP.temperature,
                emptyWarning: `${WEATHER_GROUP_LABELS.temperature}: Ingen stasjonskandidater.`,
                fallbackWarning: `${WEATHER_GROUP_LABELS.temperature}: Kunne ikke hente data fra Frost.`,
                partialWarning: (failedChunks, totalChunks) =>
                  `${WEATHER_GROUP_LABELS.temperature}: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
                buildChunkWarning: (error) => buildObservationWarning("temperature", error),
                logLabel: "Weather observation fetch failed",
                logContext: { group: "temperature" },
              }
            ),
        completePrimarySource
          ? Promise.resolve({ payload: combinedPrimaryResult.payload, warning: null })
          : getObservationPayload(
              humidityCandidates
                .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.humidity)
                .map((candidate) => candidate.sourceId),
              dateFrom,
              dateTo,
              WEATHER_GROUP_ELEMENTS.humidity,
              frostAuth,
              {
                chunkSize: OBSERVATION_BATCH_SIZE_BY_GROUP.humidity,
                emptyWarning: `${WEATHER_GROUP_LABELS.humidity}: Ingen stasjonskandidater.`,
                fallbackWarning: `${WEATHER_GROUP_LABELS.humidity}: Kunne ikke hente data fra Frost.`,
                partialWarning: (failedChunks, totalChunks) =>
                  `${WEATHER_GROUP_LABELS.humidity}: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
                buildChunkWarning: (error) => buildObservationWarning("humidity", error),
                logLabel: "Weather observation fetch failed",
                logContext: { group: "humidity" },
              }
            ),
        completePrimarySource
          ? Promise.resolve({ payload: combinedPrimaryResult.payload, warning: null })
          : getObservationPayload(
              precipitationCandidates
                .slice(0, OBSERVATION_SOURCE_LIMIT_BY_GROUP.precipitation)
                .map((candidate) => candidate.sourceId),
              dateFrom,
              dateTo,
              WEATHER_GROUP_ELEMENTS.precipitation,
              frostAuth,
              {
                chunkSize: OBSERVATION_BATCH_SIZE_BY_GROUP.precipitation,
                emptyWarning: `${WEATHER_GROUP_LABELS.precipitation}: Ingen stasjonskandidater.`,
                fallbackWarning: `${WEATHER_GROUP_LABELS.precipitation}: Kunne ikke hente data fra Frost.`,
                partialWarning: (failedChunks, totalChunks) =>
                  `${WEATHER_GROUP_LABELS.precipitation}: Delvis datatap fra Frost (${failedChunks}/${totalChunks} delspørringer feilet).`,
                buildChunkWarning: (error) => buildObservationWarning("precipitation", error),
                logLabel: "Weather observation fetch failed",
                logContext: { group: "precipitation" },
              }
            ),
        windResultPromise,
        snowResultPromise,
        normalTempPromise,
      ]);
    markTiming("observationsResolvedMs");

    const observationWarnings = [
      temperatureResult.warning,
      humidityResult.warning,
      windResult.warning,
      precipitationResult.warning,
      snowResult.warning,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    const temperatureSource = completePrimarySource ?? pickNearestSourceWithData(temperatureCandidates, temperatureResult.payload, dates);
    const humiditySource = completePrimarySource ?? pickNearestSourceWithData(humidityCandidates, humidityResult.payload, dates);
    const windSource = pickNearestSourceWithData(windCandidates, windResult.payload, dates);
    const precipitationSource = completePrimarySource ?? pickNearestSourceWithData(precipitationCandidates, precipitationResult.payload, dates);
    const snowSource = pickNearestSourceWithData(snowCandidates, snowResult.payload, dates);

    const selectedSources: Record<WeatherGroupKey, FrostSourceSelection> = {
      temperature: {
        sourceId: temperatureSource.sourceId,
        sourceName: temperatureSource.sourceName,
      },
      humidity: {
        sourceId: humiditySource.sourceId,
        sourceName: humiditySource.sourceName,
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
        humidity: { payload: humidityResult.payload, source: humiditySource },
        wind: { payload: windResult.payload, source: windSource },
        precipitation: { payload: precipitationResult.payload, source: precipitationSource },
        snow: { payload: snowResult.payload, source: snowSource },
      },
      dates
    );
    if (!hasAnyObservationData(observation)) {
      throw new Error(
        observationWarnings[0] ??
          "Kunne ikke hente brukbare observasjoner fra Frost for valgt dato."
      );
    }
    if (completePrimarySource) {
      const windSupplemented = selectedSources.wind.sourceId !== completePrimarySource.sourceId;
      const snowSupplemented = selectedSources.snow.sourceId !== completePrimarySource.sourceId;
      if (windSupplemented || snowSupplemented) {
        observationWarnings.push(
          "Temperatur, relativ luftfuktighet og nedbør er hentet fra nærmeste komplette værstasjon. Vind og/eller snødybde er supplert fra andre stasjoner."
        );
      }
    } else {
      observationWarnings.push(
        "Ingen enkelt værstasjon hadde komplette data for temperatur, relativ luftfuktighet og nedbør på valgt dato. Rapporten bruker derfor nærmeste tilgjengelige stasjon per værparameter."
      );
    }

    const missingFieldLabels = [
      observation.maxTempC === null && observation.minTempC === null && observation.avgTempC === null
        ? "Temperatur"
        : null,
      observation.maxRelativeHumidity === null &&
      observation.minRelativeHumidity === null &&
      observation.avgRelativeHumidity === null
        ? "Relativ luftfuktighet"
        : null,
      observation.precipitationMm === null ? "Nedbør" : null,
    ].filter((value): value is string => Boolean(value));

    if (missingFieldLabels.length > 0) {
      observationWarnings.push(`Manglende værfelt fra Frost: ${missingFieldLabels.join(", ")}.`);
    }

    const sourceName = buildSourceSummaryByGroup(selectedSources);
    const weatherDescription = describeWeather(
      observation.avgTempC,
      observation.precipitationMm,
      observation.maxWindMs,
      observation.snowDepthCm
    );

    const snapshot: IndoorClimateWeatherSnapshot = {
      address,
      dateFrom,
      dateTo,
      sourceName,
      sourceStrategy: completePrimarySource ? "single-station" : "group-fallback",
      sourceSelections: [
        { parameter: "Temperatur", sourceName: selectedSources.temperature.sourceName, sourceId: selectedSources.temperature.sourceId },
        { parameter: "Relativ luftfuktighet", sourceName: selectedSources.humidity.sourceName, sourceId: selectedSources.humidity.sourceId },
        { parameter: "Nedbør", sourceName: selectedSources.precipitation.sourceName, sourceId: selectedSources.precipitation.sourceId },
        { parameter: "Vind", sourceName: selectedSources.wind.sourceName, sourceId: selectedSources.wind.sourceId },
        { parameter: "Snødybde", sourceName: selectedSources.snow.sourceName, sourceId: selectedSources.snow.sourceId },
      ],
      weatherEmoji: weatherDescription.emoji,
      weatherDescription: weatherDescription.description,
      warnings: observationWarnings,
      maxTempC: roundOne(observation.maxTempC),
      minTempC: roundOne(observation.minTempC),
      avgTempC: roundOne(observation.avgTempC),
      maxRelativeHumidity: roundOne(observation.maxRelativeHumidity),
      minRelativeHumidity: roundOne(observation.minRelativeHumidity),
      avgRelativeHumidity: roundOne(observation.avgRelativeHumidity),
      normalTempC: roundOne(normalTempC),
      precipitationMm: roundOne(observation.precipitationMm),
      snowDepthCm: roundOne(observation.snowDepthCm),
      avgWindMs: roundOne(observation.avgWindMs),
      maxWindMs: roundOne(observation.maxWindMs),
      hourly: observation.hourly.map((row) => ({
        ...row,
        temperatureC: roundOne(row.temperatureC),
        relativeHumidity: roundOne(row.relativeHumidity),
        precipitationMm: roundOne(row.precipitationMm),
        windMs: roundOne(row.windMs),
        maxWindMs: roundOne(row.maxWindMs),
        snowDepthCm: roundOne(row.snowDepthCm),
      })),
    };

    logTimingSummary("success", {
      dateCount: dates.size,
      usedProvidedCoordinates: latParam !== null && lonParam !== null && isValidCoordinate(latParam, lonParam),
      completePrimarySource: Boolean(completePrimarySource),
      candidateCounts: {
        primary: primaryStationCandidates.length,
        temperature: temperatureCandidates.length,
        humidity: humidityCandidates.length,
        wind: windCandidates.length,
        precipitation: precipitationCandidates.length,
        snow: snowCandidates.length,
      },
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    logTimingSummary("error");
    if (error instanceof Error) {
      console.error("Weather API error:", {
        durationMs: Date.now() - startedAtMs,
        stagesMs: timingMarks,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("Weather API error:", {
        durationMs: Date.now() - startedAtMs,
        stagesMs: timingMarks,
        error,
      });
    }
    return NextResponse.json({ error: getSafeWeatherErrorMessage(error) }, { status: 500 });
  }
}
