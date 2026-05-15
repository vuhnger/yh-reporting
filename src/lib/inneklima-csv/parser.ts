// Parser for Kimo Kistock CSV exports (inneklima/indoor-climate dataloggers).
//
// Verified format characteristics observed in production exports:
//   - ISO-8859-1 (Latin-1) encoded; passed in as a Buffer/Uint8Array or a pre-decoded string.
//   - Optional first line: `sep=;` (Excel separator hint).
//   - Semicolon (;) as field separator.
//   - Comma (,) as decimal separator.
//   - Norwegian dates: `DD.MM.YYYY HH:MM:SS`.
//   - Channels labelled like: `Ch-int1 Temp [°C]`, `Ch-int2 %RH [%RH]`, `Ch-int3 CO2 [ppm]`.
//
// The parser is permissive about column ordering and additional/unknown channels.
// Channels are matched by header keywords, not by fixed position.

export interface InneklimaSample {
  index: number;
  timestamp: Date;
  temperatureC: number | null;
  relativeHumidity: number | null;
  co2Ppm: number | null;
}

export interface MetricStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

export interface InneklimaStats {
  temperature: MetricStats;
  humidity: MetricStats;
  co2: MetricStats;
}

export interface InneklimaCsvMetadata {
  startTime: Date | null;
  endTime: Date | null;
  durationMs: number | null;
  sampleCount: number;
  intervalSeconds: number | null;
  channels: {
    temperature: boolean;
    humidity: boolean;
    co2: boolean;
  };
}

export interface InneklimaParseWarning {
  row: number;
  message: string;
}

export interface InneklimaParseResult {
  samples: InneklimaSample[];
  stats: InneklimaStats;
  metadata: InneklimaCsvMetadata;
  warnings: InneklimaParseWarning[];
}

interface InneklimaChannelFlags {
  temperature: boolean;
  humidity: boolean;
  co2: boolean;
}

const NORWEGIAN_DATETIME = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;

interface ColumnMap {
  index: number | null;
  date: number | null;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
}

function emptyStats(): MetricStats {
  return { min: null, max: null, avg: null, count: 0 };
}

function emptyResult(): InneklimaParseResult {
  return {
    samples: [],
    stats: {
      temperature: emptyStats(),
      humidity: emptyStats(),
      co2: emptyStats(),
    },
    metadata: {
      startTime: null,
      endTime: null,
      durationMs: null,
      sampleCount: 0,
      intervalSeconds: null,
      channels: { temperature: false, humidity: false, co2: false },
    },
    warnings: [],
  };
}

function detectSeparator(line: string): string {
  // Default to semicolon (Norwegian/European Excel default), but allow comma fallback.
  if (line.includes(";")) return ";";
  if (line.includes("\t")) return "\t";
  return ",";
}

function splitLine(line: string, sep: string): string[] {
  // Kimo CSVs do not quote fields. A simple split is sufficient and avoids
  // mis-handling embedded commas inside the (otherwise unquoted) decimal numbers
  // when sep happens to be comma.
  return line.split(sep);
}

function parseNorwegianNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseNorwegianDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = NORWEGIAN_DATETIME.exec(trimmed);
  if (!match) {
    // Fall back to ISO if Kimo ever exports that.
    const iso = new Date(trimmed);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi),
    Number(ss),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    index: null,
    date: null,
    temperature: null,
    humidity: null,
    co2: null,
  };

  headers.forEach((rawHeader, position) => {
    const header = rawHeader.toLowerCase().trim();
    if (!header) return;

    // Order matters: more specific matches first. CO2 must be detected before "co"-anything.
    if (map.co2 === null && /co\s*2|co2|carbon\s*dioxide/.test(header)) {
      map.co2 = position;
      return;
    }
    if (map.humidity === null && /(%\s*rh|relative\s*humidity|fukt|hygro)/.test(header)) {
      map.humidity = position;
      return;
    }
    if (map.temperature === null && /(temp|°c|\bt\s*\[)/.test(header)) {
      map.temperature = position;
      return;
    }
    if (map.date === null && /(dato|date|time|tid|timestamp)/.test(header)) {
      map.date = position;
      return;
    }
    if (map.index === null && /(indeks|index|^#$|nr\.?$)/.test(header)) {
      map.index = position;
      return;
    }
  });

  return map;
}

function findHeaderRow(rows: string[][]): number {
  // Header is the first row that has at least one column matching a known metric
  // keyword. This skips Kimo "sep=" hints and any preamble lines.
  for (let i = 0; i < rows.length; i += 1) {
    const cells = rows[i].map((c) => c.toLowerCase());
    if (cells.length === 1 && cells[0].startsWith("sep=")) continue;
    const joined = cells.join(" ");
    if (/temp|°c|%\s*rh|co\s*2|fukt/.test(joined)) {
      return i;
    }
  }
  return -1;
}

function detectInterval(samples: InneklimaSample[]): number | null {
  if (samples.length < 2) return null;
  const deltas: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const dt = samples[i].timestamp.getTime() - samples[i - 1].timestamp.getTime();
    if (dt > 0) deltas.push(dt);
  }
  if (deltas.length === 0) return null;
  // Use median to be robust against gaps from device pauses.
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  return Math.round(median / 1000);
}

function computeStats(values: Array<number | null>): MetricStats {
  const filtered = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (filtered.length === 0) return emptyStats();
  let min = filtered[0];
  let max = filtered[0];
  let sum = 0;
  for (const v of filtered) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return {
    min,
    max,
    avg: sum / filtered.length,
    count: filtered.length,
  };
}

export function summarizeInneklimaSamples(
  samples: InneklimaSample[],
  channels: InneklimaChannelFlags,
): Pick<InneklimaParseResult, "stats" | "metadata"> {
  const startTime = samples[0]?.timestamp ?? null;
  const endTime = samples[samples.length - 1]?.timestamp ?? null;

  return {
    stats: {
      temperature: computeStats(samples.map((s) => s.temperatureC)),
      humidity: computeStats(samples.map((s) => s.relativeHumidity)),
      co2: computeStats(samples.map((s) => s.co2Ppm)),
    },
    metadata: {
      startTime,
      endTime,
      durationMs: startTime && endTime ? endTime.getTime() - startTime.getTime() : null,
      sampleCount: samples.length,
      intervalSeconds: detectInterval(samples),
      channels,
    },
  };
}

/**
 * Parse a Kimo Kistock CSV file from raw text.
 *
 * The text is expected to already be decoded. Use {@link parseInneklimaCsvBytes}
 * to handle Buffer/Uint8Array inputs (Kimo defaults to ISO-8859-1).
 */
export function parseInneklimaCsv(text: string): InneklimaParseResult {
  if (!text) return emptyResult();

  // Strip UTF-8 BOM if present (rare for Kimo, common for re-saved-from-Excel).
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rawLines = cleaned.split(/\r\n|\r|\n/).filter((line) => line.length > 0);
  if (rawLines.length === 0) return emptyResult();

  // Detect separator from the first non-`sep=` line we can find.
  let sepProbeIndex = 0;
  while (sepProbeIndex < rawLines.length && rawLines[sepProbeIndex].toLowerCase().startsWith("sep=")) {
    sepProbeIndex += 1;
  }
  const probeLine = rawLines[sepProbeIndex] ?? "";
  let separator = detectSeparator(probeLine);

  // Honor the explicit `sep=X` hint when present.
  for (const line of rawLines) {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith("sep=")) {
      const hint = line.trim().slice(4);
      if (hint.length === 1) separator = hint;
      break;
    }
  }

  const rows = rawLines.map((line) => splitLine(line, separator));
  const headerRow = findHeaderRow(rows);
  if (headerRow === -1) return emptyResult();

  const headers = rows[headerRow];
  const columns = buildColumnMap(headers);

  const result = emptyResult();
  result.metadata.channels = {
    temperature: columns.temperature !== null,
    humidity: columns.humidity !== null,
    co2: columns.co2 !== null,
  };

  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length === 1 && row[0].trim() === "") continue;

    const dateRaw = columns.date !== null ? row[columns.date] ?? "" : "";
    const timestamp = parseNorwegianDate(dateRaw);
    if (!timestamp) {
      if (dateRaw.trim()) {
        result.warnings.push({ row: i + 1, message: `Ugyldig dato: "${dateRaw}"` });
      }
      continue;
    }

    const indexRaw = columns.index !== null ? row[columns.index] ?? "" : "";
    const indexParsed = Number.parseInt(indexRaw, 10);
    const sample: InneklimaSample = {
      index: Number.isFinite(indexParsed) ? indexParsed : result.samples.length + 1,
      timestamp,
      temperatureC:
        columns.temperature !== null ? parseNorwegianNumber(row[columns.temperature] ?? "") : null,
      relativeHumidity:
        columns.humidity !== null ? parseNorwegianNumber(row[columns.humidity] ?? "") : null,
      co2Ppm: columns.co2 !== null ? parseNorwegianNumber(row[columns.co2] ?? "") : null,
    };

    result.samples.push(sample);
  }

  if (result.samples.length === 0) return result;

  const summary = summarizeInneklimaSamples(result.samples, result.metadata.channels);
  result.stats = summary.stats;
  result.metadata = summary.metadata;

  return result;
}

/**
 * Decode a raw byte buffer (typically ISO-8859-1 from Kimo) and parse it.
 *
 * If the buffer begins with a UTF-8 BOM, UTF-8 is used; otherwise ISO-8859-1
 * is assumed since Kimo's exports are not UTF-8. ISO-8859-1 is byte-safe for
 * ASCII content, so this never corrupts the numeric data we care about.
 */
export function parseInneklimaCsvBytes(bytes: Uint8Array | ArrayBuffer): InneklimaParseResult {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const hasUtf8Bom =
    view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf;
  const encoding = hasUtf8Bom ? "utf-8" : "iso-8859-1";
  const decoder = new TextDecoder(encoding);
  const text = decoder.decode(view);
  return parseInneklimaCsv(text);
}

/**
 * Map the parser's stats shape to the report tool's `IndoorClimateMetricStats`
 * (which uses {@link Number | null} fields). Lossless – just drops `count`.
 */
export function toReportStats(stats: MetricStats): { min: number | null; max: number | null; avg: number | null } {
  return { min: stats.min, max: stats.max, avg: stats.avg };
}
