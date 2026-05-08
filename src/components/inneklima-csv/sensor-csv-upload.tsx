"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  parseInneklimaCsvBytes,
  roundMetricStats,
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

export function SensorCsvUpload({
  onStatsParsed,
  onChartImageReady,
  onPeriodParsed,
}: SensorCsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<UploadedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  const samples = uploaded?.result.samples ?? [];
  const metadata = uploaded?.result.metadata ?? null;
  const warnings = uploaded?.result.warnings ?? [];

  const channelSummary = useMemo(() => {
    if (!metadata) return "";
    const items: string[] = [];
    if (metadata.channels.temperature) items.push("Temperatur");
    if (metadata.channels.humidity) items.push("RH");
    if (metadata.channels.co2) items.push("CO2");
    return items.join(", ") || "Ingen kjente kanaler funnet";
  }, [metadata]);

  // Push parsed stats and period up exactly once per new upload.
  useEffect(() => {
    if (!uploaded) return;
    const { stats, metadata: meta } = uploaded.result;
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
  }, [uploaded]);

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
                {formatDate(metadata.startTime)} → {formatDate(metadata.endTime)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Varighet / intervall:</dt>{" "}
              <dd className="inline">
                {formatDuration(metadata.durationMs)} · {formatInterval(metadata.intervalSeconds)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-muted-foreground">Antall målinger:</dt>{" "}
              <dd className="inline">{metadata.sampleCount}</dd>
            </div>
            {warnings.length > 0 && (
              <div>
                <dt className="inline font-medium text-amber-700">Advarsler:</dt>{" "}
                <dd className="inline">{warnings.length} rader hoppet over</dd>
              </div>
            )}
          </dl>

          <InneklimaChart samples={samples} onImageReady={onChartImageReady} />

          <p className="text-xs text-muted-foreground">
            Min/max/gjennomsnitt og graf er fylt ut automatisk. Du kan fortsatt redigere
            verdiene i tabellen under.
          </p>
        </div>
      )}
    </div>
  );
}
