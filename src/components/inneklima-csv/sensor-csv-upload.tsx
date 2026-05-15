"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  parseInneklimaCsvBytes,
  roundMetricStats,
  summarizeInneklimaSamples,
  type InneklimaParseResult,
} from "@/lib/inneklima-csv";

import { InneklimaChart } from "./inneklima-chart";

interface UploadedCsv {
  fileName: string;
  result: InneklimaParseResult;
}

interface SensorCsvUploadProps {
  /**
   * Called when stats are extracted from a fresh CSV. The shape matches
   * `IndoorClimateMetricStats` so the parent can patch sensor.stats directly.
   */
  onStatsParsed: (stats: {
    temperature: { min: number | null; max: number | null; avg: number | null };
    humidity: { min: number | null; max: number | null; avg: number | null };
    co2: { min: number | null; max: number | null; avg: number | null };
  }) => void;
  /**
   * Called when the chart has been rendered to a PNG data URL. Wire this to
   * `sensor.chartImage` so the report pipeline picks it up automatically.
   */
  onChartImageReady: (dataUrl: string) => void;
  /**
   * Called once per upload with the measurement period as `YYYY-MM-DD` strings
   * derived from the parsed timestamps (local time). Wire to
   * `updateSharedMetadata({ date: startDate })` so the weather lookup picks up
   * the actual measurement period instead of "today".
   */
  onPeriodParsed?: (startDate: string, endDate: string) => void;
}

function toLocalIsoDate(d: Date): string {
  // Format a Date's *local* calendar day as YYYY-MM-DD. Avoids the off-by-one
  // shift that `toISOString().split('T')[0]` introduces when the local date
  // straddles UTC midnight.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const NB_DATETIME = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(date: Date | null): string {
  return date ? NB_DATETIME.format(date) : "—";
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";
  const days = durationMs / (1000 * 60 * 60 * 24);
  if (days >= 1) return `${days.toFixed(1)} dager`;
  const hours = durationMs / (1000 * 60 * 60);
  return `${hours.toFixed(1)} timer`;
}

function formatInterval(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

function toDateTimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function SensorCsvUpload({
  onStatsParsed,
  onChartImageReady,
  onPeriodParsed,
}: SensorCsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<UploadedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cropStart, setCropStart] = useState("");
  const [cropEnd, setCropEnd] = useState("");

  // Keep the latest "fire once per upload" callbacks in refs so the upload
  // effect below doesn't depend on them. The chart image callback can be
  // passed straight through – InneklimaChart manages its own ref so a fresh
  // callback per render is safe there.
  const onStatsParsedRef = useRef(onStatsParsed);
  const onPeriodParsedRef = useRef(onPeriodParsed);
  useEffect(() => {
    onStatsParsedRef.current = onStatsParsed;
  }, [onStatsParsed]);
  useEffect(() => {
    onPeriodParsedRef.current = onPeriodParsed;
  }, [onPeriodParsed]);

  const samples = useMemo(() => uploaded?.result.samples ?? [], [uploaded]);
  const metadata = uploaded?.result.metadata ?? null;
  const warnings = uploaded?.result.warnings ?? [];
  const croppedSamples = useMemo(() => {
    const cropStartDate = cropStart ? new Date(cropStart) : null;
    const cropEndDate = cropEnd ? new Date(cropEnd) : null;
    return samples.filter((sample) => {
      const timestamp = sample.timestamp.getTime();
      if (cropStartDate && !Number.isNaN(cropStartDate.getTime()) && timestamp < cropStartDate.getTime()) {
        return false;
      }
      if (cropEndDate && !Number.isNaN(cropEndDate.getTime()) && timestamp > cropEndDate.getTime()) {
        return false;
      }
      return true;
    });
  }, [cropEnd, cropStart, samples]);
  const croppedSummary = useMemo(() => {
    if (!uploaded) return null;
    return summarizeInneklimaSamples(croppedSamples, uploaded.result.metadata.channels);
  }, [croppedSamples, uploaded]);

  const channelSummary = useMemo(() => {
    if (!metadata) return "";
    const items: string[] = [];
    if (metadata.channels.temperature) items.push("Temperatur");
    if (metadata.channels.humidity) items.push("RH");
    if (metadata.channels.co2) items.push("CO2");
    return items.join(", ") || "Ingen kjente kanaler funnet";
  }, [metadata]);

  // Push parsed stats and period up whenever the selected crop changes.
  useEffect(() => {
    if (!uploaded) return;
    const stats = croppedSummary?.stats ?? uploaded.result.stats;
    const meta = croppedSummary?.metadata ?? uploaded.result.metadata;
    onStatsParsedRef.current({
      temperature: roundMetricStats(stats.temperature, 1),
      humidity: roundMetricStats(stats.humidity, 1),
      co2: roundMetricStats(stats.co2, 0),
    });
    if (meta.startTime && meta.endTime && onPeriodParsedRef.current) {
      onPeriodParsedRef.current(
        toLocalIsoDate(meta.startTime),
        toLocalIsoDate(meta.endTime),
      );
    }
  }, [croppedSummary, uploaded]);

  async function handleFile(file: File) {
    setError(null);
    setPending(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseInneklimaCsvBytes(new Uint8Array(buffer));
      if (result.samples.length === 0) {
        setError(
          "Fant ingen gyldige målinger i filen. Sjekk at det er en Kimo-CSV med Dato- og målekolonner.",
        );
        setUploaded(null);
        return;
      }
      setCropStart(toDateTimeLocalValue(result.metadata.startTime));
      setCropEnd(toDateTimeLocalValue(result.metadata.endTime));
      setUploaded({ fileName: file.name, result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil ved lesing av filen.");
      setUploaded(null);
    } finally {
      setPending(false);
    }
  }

  function handleClear() {
    setUploaded(null);
    setError(null);
    setCropStart("");
    setCropEnd("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded border p-3 bg-slate-50/50">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
            // Reset the input value so re-selecting the same file fires onChange again.
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploaded ? "Bytt CSV-fil" : "Last opp Kimo-CSV"}
        </Button>
        {uploaded && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Fjern
          </Button>
        )}
        {pending && (
          <span className="text-sm text-muted-foreground">Leser fil…</span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {uploaded && metadata && (
        <div className="space-y-3">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="inline font-medium text-muted-foreground">Fil:</dt>{" "}
              <dd className="inline">{uploaded.fileName}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Kanaler:</dt>{" "}
              <dd className="inline">{channelSummary}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Måleperiode:</dt>{" "}
              <dd className="inline">
                {formatDate(croppedSummary?.metadata.startTime ?? metadata.startTime)} → {formatDate(croppedSummary?.metadata.endTime ?? metadata.endTime)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Varighet / intervall:</dt>{" "}
              <dd className="inline">
                {formatDuration(croppedSummary?.metadata.durationMs ?? metadata.durationMs)} · {formatInterval(croppedSummary?.metadata.intervalSeconds ?? metadata.intervalSeconds)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Antall målinger:</dt>{" "}
              <dd className="inline">{croppedSummary?.metadata.sampleCount ?? metadata.sampleCount}</dd>
            </div>
            {warnings.length > 0 && (
              <div>
                <dt className="inline font-medium text-amber-700">Advarsler:</dt>{" "}
                <dd className="inline">{warnings.length} rader hoppet over</dd>
              </div>
            )}
          </dl>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded border bg-white p-3">
            <div className="space-y-1">
              <label htmlFor="crop-start" className="text-sm font-medium">Start på utsnitt</label>
              <input
                id="crop-start"
                type="datetime-local"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                value={cropStart}
                max={cropEnd || undefined}
                onChange={(e) => setCropStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="crop-end" className="text-sm font-medium">Slutt på utsnitt</label>
              <input
                id="crop-end"
                type="datetime-local"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                value={cropEnd}
                min={cropStart || undefined}
                onChange={(e) => setCropEnd(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Juster start og slutt for å croppe datasettet. Graf, måleperiode og gjennomsnitt oppdateres automatisk.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCropStart(toDateTimeLocalValue(metadata.startTime));
                  setCropEnd(toDateTimeLocalValue(metadata.endTime));
                }}
              >
                Nullstill utsnitt
              </Button>
            </div>
          </div>

          {croppedSamples.length === 0 && (
            <p className="text-sm text-destructive">Ingen målinger i valgt utsnitt.</p>
          )}

          <InneklimaChart samples={croppedSamples} onImageReady={onChartImageReady} />

          <p className="text-xs text-muted-foreground">
            Min/max/gjennomsnitt og graf er fylt ut automatisk. Du kan fortsatt redigere
            verdiene i tabellen under.
          </p>
        </div>
      )}
    </div>
  );
}
