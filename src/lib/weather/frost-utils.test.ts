import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner needs the explicit extension here.
import { buildObservationWarning, buildSourceSummaryByGroup, enumerateDates, getObservationSnapshot, hasAnyObservationData, pickBestCombinedSource, PRIMARY_WEATHER_GROUPS } from "./frost-utils.ts";

test("pickBestCombinedSource prefers nearest candidate with all required groups", () => {
  const candidates = [
    { sourceId: "SN1", sourceName: "Nearest partial", normalizedSourceId: "SN1" },
    { sourceId: "SN2", sourceName: "Nearest complete", normalizedSourceId: "SN2" },
  ];

  const payload = {
    data: [
      {
        sourceId: "SN1:0",
        referenceTime: "2026-04-29T10:00:00Z",
        observations: [
          { elementId: "air_temperature", value: 12 },
          { elementId: "relative_humidity", value: 44 },
        ],
      },
      {
        sourceId: "SN2:0",
        referenceTime: "2026-04-29T10:00:00Z",
        observations: [
          { elementId: "air_temperature", value: 11 },
          { elementId: "relative_humidity", value: 47 },
          { elementId: "precipitation_amount", value: 0.4 },
        ],
      },
    ],
  };

  assert.deepEqual(
    pickBestCombinedSource(candidates, payload, new Set(["2026-04-29"]), PRIMARY_WEATHER_GROUPS),
    candidates[1]
  );
});

test("buildSourceSummaryByGroup collapses a single shared station name", () => {
  const sources = {
    temperature: { sourceId: "SN1", sourceName: "Oslo - Blindern" },
    humidity: { sourceId: "SN1", sourceName: "Oslo - Blindern" },
    wind: { sourceId: "SN1", sourceName: "Oslo - Blindern" },
    precipitation: { sourceId: "SN1", sourceName: "Oslo - Blindern" },
    snow: { sourceId: "SN1", sourceName: "Oslo - Blindern" },
  };

  assert.equal(buildSourceSummaryByGroup(sources), "Oslo - Blindern");
});

test("getObservationSnapshot calculates humidity and precipitation fields", () => {
  const source = { sourceId: "SN1", sourceName: "Oslo - Blindern", normalizedSourceId: "SN1" };
  const payloads = {
    temperature: {
      source,
      payload: {
        data: [
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T08:00:00Z",
            observations: [{ elementId: "air_temperature", value: 10 }],
          },
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T09:00:00Z",
            observations: [{ elementId: "air_temperature", value: 14 }],
          },
        ],
      },
    },
    humidity: {
      source,
      payload: {
        data: [
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T08:00:00Z",
            observations: [{ elementId: "relative_humidity", value: 40 }],
          },
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T09:00:00Z",
            observations: [{ elementId: "relative_humidity", value: 60 }],
          },
        ],
      },
    },
    wind: {
      source,
      payload: {
        data: [
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T08:00:00Z",
            observations: [
              { elementId: "wind_speed", value: 2 },
              { elementId: "wind_speed_of_gust", value: 5 },
            ],
          },
        ],
      },
    },
    precipitation: {
      source,
      payload: {
        data: [
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T08:00:00Z",
            observations: [{ elementId: "precipitation_amount", value: 0.2 }],
          },
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T09:00:00Z",
            observations: [{ elementId: "precipitation_amount", value: 0.3 }],
          },
        ],
      },
    },
    snow: {
      source,
      payload: {
        data: [
          {
            sourceId: "SN1:0",
            referenceTime: "2026-04-29T08:00:00Z",
            observations: [{ elementId: "surface_snow_thickness", value: 12 }],
          },
        ],
      },
    },
  };

  const snapshot = getObservationSnapshot(payloads, new Set(["2026-04-29"]));

  assert.equal(snapshot.maxTempC, 14);
  assert.equal(snapshot.minTempC, 10);
  assert.equal(snapshot.avgTempC, 12);
  assert.equal(snapshot.maxRelativeHumidity, 60);
  assert.equal(snapshot.minRelativeHumidity, 40);
  assert.equal(snapshot.avgRelativeHumidity, 50);
  assert.equal(snapshot.precipitationMm, 0.5);
  assert.equal(snapshot.maxWindMs, 5);
  assert.equal(snapshot.snowDepthCm, 12);
  assert.equal(snapshot.hourly.length, 2);
  assert.equal(snapshot.hourly[0]?.relativeHumidity, 40);
  assert.equal(hasAnyObservationData(snapshot), true);
});

test("enumerateDates returns inclusive YYYY-MM-DD list", () => {
  assert.deepEqual(enumerateDates("2026-04-29", "2026-05-04"), [
    "2026-04-29",
    "2026-04-30",
    "2026-05-01",
    "2026-05-02",
    "2026-05-03",
    "2026-05-04",
  ]);
  assert.deepEqual(enumerateDates("2026-04-29", "2026-04-29"), ["2026-04-29"]);
  assert.deepEqual(enumerateDates("2026-05-04", "2026-04-29"), []);
});

test("getObservationSnapshot aggregates across multiple days", () => {
  const source = { sourceId: "SN1", sourceName: "Oslo - Blindern", normalizedSourceId: "SN1" };
  const payload = {
    data: [
      {
        sourceId: "SN1:0",
        referenceTime: "2026-04-29T09:00:00Z",
        observations: [{ elementId: "air_temperature", value: 10 }],
      },
      {
        sourceId: "SN1:0",
        referenceTime: "2026-04-30T09:00:00Z",
        observations: [{ elementId: "air_temperature", value: 14 }],
      },
      {
        sourceId: "SN1:0",
        referenceTime: "2026-05-01T09:00:00Z",
        observations: [{ elementId: "air_temperature", value: 18 }],
      },
    ],
  };
  const empty = { source, payload: { data: [] } };
  const payloads = {
    temperature: { source, payload },
    humidity: empty,
    wind: empty,
    precipitation: empty,
    snow: empty,
  };

  const snapshot = getObservationSnapshot(
    payloads,
    new Set(["2026-04-29", "2026-04-30", "2026-05-01"]),
  );

  assert.equal(snapshot.minTempC, 10);
  assert.equal(snapshot.maxTempC, 18);
  assert.equal(snapshot.avgTempC, 14);
  assert.equal(snapshot.hourly.length, 3);
  assert.deepEqual(
    snapshot.hourly.map((row) => row.date),
    ["2026-04-29", "2026-04-30", "2026-05-01"],
  );
});

test("buildObservationWarning keeps status-specific messages stable", () => {
  assert.equal(
    buildObservationWarning("precipitation", new Error("Request failed (500): boom")),
    "Nedbør: Frost svarte 500 (intern feil hos datakilde)."
  );
  assert.equal(
    buildObservationWarning("humidity", new Error('Request failed (429): {"reason":"Rate limited"}')),
    "Relativ luftfuktighet: Frost svarte 429 (for mange forespørsler). Prøv igjen om litt."
  );
});
