import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { IndoorClimateWeatherSnapshot } from "@/lib/reports/templates/indoor-climate/schema";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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

function buildFrostAuth(clientId: string): string {
  return `Basic ${Buffer.from(`${clientId}:`).toString("base64")}`;
}

async function fetchJson<T = unknown>(url: string, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Request failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

function extractCoordinate(node: JsonValue | undefined, depth = 0): { lat: number; lon: number } | null {
  if (!node || depth > 7) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const nested = extractCoordinate(item as JsonValue, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof node !== "object") return null;

  const record = node as Record<string, JsonValue>;
  const lat =
    toNumber(record.lat) ??
    toNumber(record.latitude) ??
    toNumber(record.nord) ??
    toNumber(record.y);
  const lon =
    toNumber(record.lon) ??
    toNumber(record.lng) ??
    toNumber(record.longitude) ??
    toNumber(record.ost) ??
    toNumber(record.x);

  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { lat, lon };
  }

  for (const value of Object.values(record)) {
    const nested = extractCoordinate(value as JsonValue, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function extractStationName(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
  if (typeof record.shortName === "string" && record.shortName.trim()) return record.shortName.trim();
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

function extractValuesByElement(
  payload: unknown,
  match: (elementId: string) => boolean
): number[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const values: number[] = [];

  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const observations = (entry as { observations?: unknown }).observations;
    if (!Array.isArray(observations)) continue;

    for (const obs of observations) {
      if (!obs || typeof obs !== "object") continue;
      const elementId = (obs as { elementId?: unknown }).elementId;
      if (typeof elementId !== "string" || !match(elementId)) continue;
      const value = toNumber((obs as { value?: unknown }).value);
      if (value !== null) values.push(value);
    }
  }

  return values;
}

async function geocodeNorwegianAddress(address: string): Promise<{ lat: number; lon: number }> {
  const url =
    `https://ws.geonorge.no/stedsnavn/v1/navn?sok=${encodeURIComponent(address)}` +
    "&fuzzy=true&utkoordsys=4258&treffPerSide=1";
  const payload = await fetchJson<JsonValue>(url);
  const coordinate = extractCoordinate(payload);
  if (!coordinate) {
    throw new Error("Fant ikke koordinater for valgt adresse.");
  }
  return coordinate;
}

async function getNearestFrostSource(
  lat: number,
  lon: number,
  frostAuth: string
): Promise<{ sourceId: string; sourceName: string }> {
  const geometry = encodeURIComponent(`nearest(POINT(${lon} ${lat}))`);
  const elements = encodeURIComponent(
    "air_temperature,wind_speed,wind_speed_of_gust,sum(precipitation_amount P1D),surface_snow_thickness"
  );
  const url =
    `https://frost.met.no/sources/v0.jsonld?geometry=${geometry}` +
    `&elements=${elements}&types=SensorSystem&country=NO`;
  const payload = await fetchJson<{ data?: unknown }>(url, {
    Authorization: frostAuth,
  });
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const first = rows[0];

  if (!first || typeof first !== "object") {
    throw new Error("Fant ingen naerliggende vaerstasjon.");
  }

  const sourceId = String((first as { id?: unknown }).id ?? "").trim();
  if (!sourceId) {
    throw new Error("Mangler stasjons-ID fra Frost.");
  }
  const sourceName = extractStationName(first) ?? sourceId;
  return { sourceId, sourceName };
}

async function getObservationSnapshot(
  sourceId: string,
  date: string,
  frostAuth: string
): Promise<{
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  avgWindMs: number | null;
  maxWindMs: number | null;
}> {
  const referenceTime = `${date}T00:00:00Z/${date}T23:59:59Z`;
  const elements = [
    "air_temperature",
    "wind_speed",
    "wind_speed_of_gust",
    "sum(precipitation_amount P1D)",
    "surface_snow_thickness",
  ].join(",");
  const url =
    `https://frost.met.no/observations/v0.jsonld?sources=${encodeURIComponent(sourceId)}` +
    `&referencetime=${encodeURIComponent(referenceTime)}` +
    `&elements=${encodeURIComponent(elements)}`;

  const payload = await fetchJson(url, {
    Authorization: frostAuth,
  });

  const temps = extractValuesByElement(payload, (id) => id.includes("air_temperature"));
  const wind = extractValuesByElement(payload, (id) => id === "wind_speed");
  const gust = extractValuesByElement(payload, (id) => id.includes("wind_speed_of_gust"));
  const precipitationDaily = extractValuesByElement(payload, (id) =>
    id.includes("sum(precipitation_amount P1D)")
  );
  const precipitationRaw = extractValuesByElement(payload, (id) =>
    id === "precipitation_amount"
  );
  const snowDepth = extractValuesByElement(payload, (id) => id.includes("surface_snow_thickness"));

  const precipitationMm =
    precipitationDaily.length > 0
      ? precipitationDaily[precipitationDaily.length - 1]
      : precipitationRaw.length > 0
        ? precipitationRaw.reduce((sum, value) => sum + value, 0)
        : null;

  const combinedWindMaxCandidates = [...wind, ...gust];

  return {
    maxTempC: temps.length > 0 ? Math.max(...temps) : null,
    minTempC: temps.length > 0 ? Math.min(...temps) : null,
    avgTempC: average(temps),
    precipitationMm,
    snowDepthCm: snowDepth.length > 0 ? snowDepth[snowDepth.length - 1] : null,
    avgWindMs: average(wind),
    maxWindMs:
      combinedWindMaxCandidates.length > 0 ? Math.max(...combinedWindMaxCandidates) : null,
  };
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
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
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

    if (!address) {
      return NextResponse.json({ error: "Adresse mangler." }, { status: 400 });
    }
    if (!date || !validateDateString(date)) {
      return NextResponse.json({ error: "Ugyldig dato. Bruk YYYY-MM-DD." }, { status: 400 });
    }

    const frostClientId = process.env.MET_FROST_CLIENT_ID;
    if (!frostClientId) {
      return NextResponse.json({ error: "Missing MET_FROST_CLIENT_ID" }, { status: 500 });
    }

    const frostAuth = buildFrostAuth(frostClientId);
    const { lat, lon } = await geocodeNorwegianAddress(address);
    const { sourceId, sourceName } = await getNearestFrostSource(lat, lon, frostAuth);
    const observation = await getObservationSnapshot(sourceId, date, frostAuth);
    const normalTempC = await getClimateNormalTemperature(sourceId, date, frostAuth);
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
      maxTempC: roundOne(observation.maxTempC),
      minTempC: roundOne(observation.minTempC),
      avgTempC: roundOne(observation.avgTempC),
      normalTempC: roundOne(normalTempC),
      precipitationMm: roundOne(observation.precipitationMm),
      snowDepthCm: roundOne(observation.snowDepthCm),
      avgWindMs: roundOne(observation.avgWindMs),
      maxWindMs: roundOne(observation.maxWindMs),
    };

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente vaerdata." },
      { status: 500 }
    );
  }
}
