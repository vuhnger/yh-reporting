"use client";

import { useEffect, useRef } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageTextarea } from "@/components/ui/image-textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIFillButton } from "@/components/wizard/ai-fill-button";
import {
  INDOOR_CLIMATE_REFERENCES,
  getIndoorClimateData,
  type IndoorClimateWeatherHour,
} from "../schema";
import { buildDailyWeatherRows, filterWeatherHourlyRows } from "../weather-table";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

function formatShortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.`;
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatWeatherSourceLabel(selection: {
  parameter: string;
  sourceName: string;
  sourceId: string;
}): string {
  return `${selection.parameter}: ${selection.sourceName} (${selection.sourceId})`;
}

export function IndoorClimateMetadataStep() {
  const { state, updateIndoorClimateMetadata } = useWizard();
  const indoor = getIndoorClimateData(state);
  const metadata = indoor?.metadata;
  const referencesSeededRef = useRef(false);

  // Seed the weather range from `sharedMetadata.date` when the user has not
  // yet uploaded a CSV (which would set both dates explicitly via
  // `updateIndoorClimateMetadata({ weatherDateFrom, weatherDateTo })`).
  useEffect(() => {
    if (!indoor) return;
    if (indoor.metadata.weatherDateFrom && indoor.metadata.weatherDateTo) return;
    updateIndoorClimateMetadata({
      weatherDateFrom: indoor.metadata.weatherDateFrom || state.sharedMetadata.date,
      weatherDateTo: indoor.metadata.weatherDateTo || state.sharedMetadata.date,
    });
  }, [indoor, state.sharedMetadata.date, updateIndoorClimateMetadata]);

  useEffect(() => {
    if (!indoor) return;
    if (referencesSeededRef.current) return;
    referencesSeededRef.current = true;
    if (indoor.metadata.manualReferences.length > 0) return;
    updateIndoorClimateMetadata({ manualReferences: [...INDOOR_CLIMATE_REFERENCES] });
  }, [indoor, updateIndoorClimateMetadata]);

  if (!indoor || !metadata) return null;

  const recommendationsText = metadata.recommendations.join("\n");
  const weatherHourFrom = Math.min(23, Math.max(0, metadata.weatherHourFrom));
  const weatherHourTo = Math.min(23, Math.max(weatherHourFrom, metadata.weatherHourTo));
  const weatherSnapshotForRange =
    metadata.weatherSnapshot?.dateFrom === metadata.weatherDateFrom &&
    metadata.weatherSnapshot?.dateTo === metadata.weatherDateTo
      ? metadata.weatherSnapshot
      : null;
  const weatherIsMultiDay =
    !!weatherSnapshotForRange &&
    weatherSnapshotForRange.dateFrom !== weatherSnapshotForRange.dateTo;
  const weatherHourlyRows: IndoorClimateWeatherHour[] =
    weatherSnapshotForRange
      ? filterWeatherHourlyRows(weatherSnapshotForRange, weatherHourFrom, weatherHourTo)
      : [];
  const weatherDailyRows = buildDailyWeatherRows(weatherHourlyRows);
  const storedWeatherTableMode = metadata.weatherTableMode === "hourly" ? "hourly" : "daily";
  const weatherTableMode = weatherIsMultiDay ? storedWeatherTableMode : "hourly";
  const weatherRowsByDate = weatherHourlyRows.reduce<
    Array<{ date: string; rows: IndoorClimateWeatherHour[] }>
  >((groups, row) => {
    const existing = groups[groups.length - 1];
    if (!existing || existing.date !== row.date) {
      groups.push({ date: row.date, rows: [row] });
      return groups;
    }
    existing.rows.push(row);
    return groups;
  }, []);
  const weatherSourceLabels = Array.isArray(weatherSnapshotForRange?.sourceSelections)
    ? weatherSnapshotForRange.sourceSelections.map(formatWeatherSourceLabel)
    : [];

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Inneklima - detaljer</CardTitle>
        <CardDescription>
          Fyll ut innhold for forsidetekst, metode, vær og anbefalinger.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <Textarea
            value={metadata.thanksText}
            onChange={(e) => updateIndoorClimateMetadata({ thanksText: e.target.value })}
            className="min-h-[120px]"
          />
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Oppsummering</h3>
          </div>
          <ImageTextarea
            value={metadata.summaryText}
            onChange={(e) => updateIndoorClimateMetadata({ summaryText: e.target.value })}
            placeholder="Skriv et overordnet sammendrag av funnene."
            className="min-h-[160px] pr-10"
            actions={
              <AIFillButton
                reportType="indoor-climate"
                field="summaryText"
                state={state}
                getValue={() => metadata.summaryText}
                setValue={(text) => updateIndoorClimateMetadata({ summaryText: text })}
              />
            }
          />
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Gjennomføring og metode</h3>
          </div>
          <ImageTextarea
            value={metadata.methodText}
            onChange={(e) => updateIndoorClimateMetadata({ methodText: e.target.value })}
            placeholder="Beskriv utstyr, prosedyre og analyse."
            className="min-h-[160px] pr-10"
            actions={
              <AIFillButton
                reportType="indoor-climate"
                field="methodText"
                state={state}
                getValue={() => metadata.methodText}
                setValue={(text) => updateIndoorClimateMetadata({ methodText: text })}
              />
            }
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Anbefalinger</h3>
              <p className="text-xs text-muted-foreground">Ett tiltak per linje.</p>
            </div>
            <AIFillButton
              reportType="indoor-climate"
              field="recommendations"
              state={state}
              getValue={() => recommendationsText}
              setValue={(text) =>
                updateIndoorClimateMetadata({ recommendations: splitLines(text) })
              }
            />
          </div>
          <div className="space-y-2">
            {metadata.recommendations.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const next = [...metadata.recommendations];
                    next[index] = e.target.value;
                    updateIndoorClimateMetadata({ recommendations: next });
                  }}
                  placeholder={`Tiltak ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    updateIndoorClimateMetadata({
                      recommendations: metadata.recommendations.filter((_, i) => i !== index),
                    })
                  }
                  aria-label="Fjern anbefaling"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateIndoorClimateMetadata({
                  recommendations: [...metadata.recommendations, ""],
                })
              }
            >
              Legg til tiltak
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Referanser</h3>
            <p className="text-xs text-muted-foreground">Du kan legge til, endre og fjerne referanser.</p>
          </div>
          <div className="space-y-2">
            {metadata.manualReferences.map((reference, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={reference}
                  onChange={(e) => {
                    const next = [...metadata.manualReferences];
                    next[index] = e.target.value;
                    updateIndoorClimateMetadata({ manualReferences: next });
                  }}
                  placeholder={`Referanse ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    updateIndoorClimateMetadata({
                      manualReferences: metadata.manualReferences.filter((_, i) => i !== index),
                    })
                  }
                  aria-label="Fjern referanse"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateIndoorClimateMetadata({
                  manualReferences: [...metadata.manualReferences, ""],
                })
              }
            >
              Legg til referanse
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="references-extra-text">Ekstra referansetekst (valgfritt)</Label>
            <Textarea
              id="references-extra-text"
              value={metadata.referencesExtraText}
              onChange={(e) => updateIndoorClimateMetadata({ referencesExtraText: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Vedlegg</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="appendices-intro-text">Introtekst for vedlegg (valgfritt)</Label>
            <Textarea
              id="appendices-intro-text"
              value={metadata.appendicesIntroText}
              onChange={(e) => updateIndoorClimateMetadata({ appendicesIntroText: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Vær</h3>
            <p className="text-xs text-muted-foreground">
              Hentes for måleperioden{" "}
              {metadata.weatherDateFrom === metadata.weatherDateTo
                ? metadata.weatherDateFrom
                : `${metadata.weatherDateFrom} – ${metadata.weatherDateTo}`}
              . Datoene fylles automatisk fra opplastet CSV, men kan endres her.
            </p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={metadata.weatherInclude}
                onChange={(e) =>
                  updateIndoorClimateMetadata({
                    weatherInclude: e.target.checked,
                    weatherSnapshot: e.target.checked ? metadata.weatherSnapshot : null,
                  })
                }
                className="h-4 w-4"
              />
              Inkluder værdata
            </label>
          </div>
          {metadata.weatherInclude && (
            <>
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <p className="text-sm">
                  <span className="font-medium">Adresse for værdata:</span>{" "}
                  {metadata.weatherAddress || state.client.address || "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Redigeres i steget &quot;Forsideinformasjon&quot;.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weather-date-from">Måleperiode fra</Label>
                  <Input
                    id="weather-date-from"
                    type="date"
                    value={metadata.weatherDateFrom}
                    max={metadata.weatherDateTo || undefined}
                    onChange={(e) => {
                      const next = e.target.value;
                      const nextTo =
                        metadata.weatherDateTo && metadata.weatherDateTo >= next
                          ? metadata.weatherDateTo
                          : next;
                      updateIndoorClimateMetadata({
                        weatherDateFrom: next,
                        weatherDateTo: nextTo,
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weather-date-to">Måleperiode til</Label>
                  <Input
                    id="weather-date-to"
                    type="date"
                    value={metadata.weatherDateTo}
                    min={metadata.weatherDateFrom || undefined}
                    onChange={(e) => {
                      updateIndoorClimateMetadata({ weatherDateTo: e.target.value });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tidsrom i tabell</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateIndoorClimateMetadata({ weatherHourFrom: 8, weatherHourTo: 20 })
                      }
                    >
                      08-20
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateIndoorClimateMetadata({ weatherHourFrom: 0, weatherHourTo: 23 })
                      }
                    >
                      00-23
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fra</Label>
                  <Select
                    value={String(weatherHourFrom)}
                    onValueChange={(value) => {
                      const nextFrom = Number(value);
                      const nextTo = Math.max(nextFrom, weatherHourTo);
                      updateIndoorClimateMetadata({
                        weatherHourFrom: nextFrom,
                        weatherHourTo: nextTo,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((option) => (
                        <SelectItem key={`from-${option.value}`} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Til</Label>
                  <Select
                    value={String(weatherHourTo)}
                    onValueChange={(value) => {
                      const nextTo = Number(value);
                      const nextFrom = Math.min(weatherHourFrom, nextTo);
                      updateIndoorClimateMetadata({
                        weatherHourFrom: nextFrom,
                        weatherHourTo: nextTo,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((option) => (
                        <SelectItem key={`to-${option.value}`} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {weatherIsMultiDay && (
                  <div className="space-y-2">
                    <Label>Tabellvisning</Label>
                    <Select
                      value={storedWeatherTableMode}
                      onValueChange={(value: "daily" | "hourly") =>
                        updateIndoorClimateMetadata({ weatherTableMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Døgnsnitt</SelectItem>
                        <SelectItem value="hourly">Time for time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {metadata.weatherFetching ? (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Henter værdata fra Frost... (kan ta 15–30 sek)
                  </p>
                ) : metadata.weatherFetchError ? (
                  <p className="text-sm text-destructive">{metadata.weatherFetchError}</p>
                ) : !weatherSnapshotForRange ? (
                  <p className="text-sm text-muted-foreground">
                    Velg adresse i &quot;Forsideinformasjon&quot; for å hente værdata.
                  </p>
                ) : null}
              </div>
              {weatherSnapshotForRange && (
                <div className="rounded-md border overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b">
                    <p className="text-sm font-medium">
                      {weatherSnapshotForRange.weatherEmoji} {weatherSnapshotForRange.weatherDescription} ·{" "}
                      {weatherSnapshotForRange.dateFrom === weatherSnapshotForRange.dateTo
                        ? weatherSnapshotForRange.dateFrom
                        : `${weatherSnapshotForRange.dateFrom} – ${weatherSnapshotForRange.dateTo}`}{" "}
                      · {String(weatherHourFrom).padStart(2, "0")}:00–{String(weatherHourTo).padStart(2, "0")}:00
                    </p>
                    {weatherSourceLabels.length > 0 ? (
                      <div className="mt-1 text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                        {weatherSourceLabels.map((label) => (
                          <p key={label}>{label}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{weatherSnapshotForRange.sourceName}</p>
                    )}
                  </div>
                  {Array.isArray(weatherSnapshotForRange.warnings) && weatherSnapshotForRange.warnings.filter((w) => !w.startsWith("Ingen enkelt værstasjon")).length > 0 && (
                    <div className="px-3 py-2 border-b bg-amber-50 text-amber-800 text-xs space-y-0.5">
                      {weatherSnapshotForRange.warnings
                        .filter((w) => !w.startsWith("Ingen enkelt værstasjon"))
                        .map((warning, index) => (
                          <p key={`${warning}-${index}`}>⚠ {warning}</p>
                        ))}
                    </div>
                  )}
                  {weatherHourlyRows.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Ingen timedata tilgjengelig for valgt tidsrom.
                    </div>
                  ) : weatherIsMultiDay && weatherTableMode === "hourly" ? (
                    <div className="divide-y">
                      {weatherRowsByDate.map((group, index) => (
                        <details key={group.date} open={index === 0} className="group">
                          <summary className="cursor-pointer list-none px-3 py-2 bg-slate-50 text-sm font-medium flex items-center justify-between gap-3">
                            <span>
                              {formatShortDate(group.date)} · {group.rows.length} målepunkter
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {group.rows[0]?.timeLabel}–{group.rows[group.rows.length - 1]?.timeLabel}
                            </span>
                          </summary>
                          <Table>
                            <TableHeader className="bg-slate-50/60">
                              <TableRow>
                                <TableHead>Tid</TableHead>
                                <TableHead>Vær</TableHead>
                                <TableHead className="text-right">Temp °C</TableHead>
                                <TableHead className="text-right">RH %</TableHead>
                                <TableHead className="text-right">Nedbør mm</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.rows.map((row) => (
                                <TableRow key={`${row.date}-${row.hour}`}>
                                  <TableCell>{row.timeLabel}</TableCell>
                                  <TableCell>{row.weatherEmoji ?? "-"}</TableCell>
                                  <TableCell className="text-right">{row.temperatureC ?? "-"}</TableCell>
                                  <TableCell className="text-right">{row.relativeHumidity ?? "-"}</TableCell>
                                  <TableCell className="text-right">{row.precipitationMm ?? "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </details>
                      ))}
                    </div>
                  ) : weatherIsMultiDay ? (
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Dato</TableHead>
                          <TableHead>Vær</TableHead>
                          <TableHead className="text-right">Snitt temp °C</TableHead>
                          <TableHead className="text-right">Min temp °C</TableHead>
                          <TableHead className="text-right">Maks temp °C</TableHead>
                          <TableHead className="text-right">RH %</TableHead>
                          <TableHead className="text-right">Nedbør mm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weatherDailyRows.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{formatShortDate(row.date)}</TableCell>
                            <TableCell>{row.weatherEmoji || row.weatherDescription || "-"}</TableCell>
                            <TableCell className="text-right">{row.avgTempC ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.minTempC ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.maxTempC ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.avgRelativeHumidity ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.precipitationMm ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Tid</TableHead>
                          <TableHead>Vær</TableHead>
                          <TableHead className="text-right">Temp °C</TableHead>
                          <TableHead className="text-right">RH %</TableHead>
                          <TableHead className="text-right">Nedbør mm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weatherHourlyRows.map((row) => (
                          <TableRow key={`${row.date}-${row.hour}`}>
                            <TableCell>{row.timeLabel}</TableCell>
                            <TableCell>{row.weatherEmoji ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.temperatureC ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.relativeHumidity ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.precipitationMm ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="px-3 py-2 border-t bg-slate-50 text-xs text-muted-foreground">
                    {weatherIsMultiDay ? "Periodeoppsummering" : "Døgnoppsummering"}: maks{" "}
                    {weatherSnapshotForRange.maxTempC ?? "-"} °C, min{" "}
                    {weatherSnapshotForRange.minTempC ?? "-"} °C, gj.snitt{" "}
                    {weatherSnapshotForRange.avgTempC ?? "-"} °C, luftfuktighet{" "}
                    {weatherSnapshotForRange.avgRelativeHumidity ?? "-"} % RH, normal{" "}
                    {weatherSnapshotForRange.normalTempC ?? "-"} °C, nedbør{" "}
                    {weatherSnapshotForRange.precipitationMm ?? "-"} mm.
                  </div>
                  {weatherSourceLabels.length > 0 && (
                    <div className="px-3 py-2 border-t bg-white text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Stasjoner brukt i tabellen</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                        {weatherSourceLabels.map((label) => (
                          <p key={`table-source-${label}`}>{label}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
