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

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function IndoorClimateMetadataStep() {
  const { state, updateIndoorClimateMetadata } = useWizard();
  const indoor = getIndoorClimateData(state);
  const metadata = indoor?.metadata;
  const referencesSeededRef = useRef(false);

  useEffect(() => {
    if (!indoor) return;
    if (indoor.metadata.weatherDate === state.sharedMetadata.date) return;
    updateIndoorClimateMetadata({ weatherDate: state.sharedMetadata.date });
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
  const weatherSnapshotForDate =
    metadata.weatherSnapshot?.date === state.sharedMetadata.date ? metadata.weatherSnapshot : null;
  const weatherHourlyRows: IndoorClimateWeatherHour[] = (() => {
    if (!weatherSnapshotForDate) return [];

    const rowsByHour = new Map<number, IndoorClimateWeatherHour>();
    for (const row of weatherSnapshotForDate.hourly) {
      rowsByHour.set(row.hour, row);
    }

    const rows: IndoorClimateWeatherHour[] = [];
    for (let hour = weatherHourFrom; hour <= weatherHourTo; hour += 1) {
      const existing = rowsByHour.get(hour);
      rows.push(
        existing ?? {
          date: weatherSnapshotForDate.date,
          hour,
          timeLabel: formatHourLabel(hour),
          temperatureC: null,
          precipitationMm: null,
          windMs: null,
          maxWindMs: null,
          snowDepthCm: null,
        }
      );
    }
    return rows;
  })();

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
              Hentes for oppdragsdato ({state.sharedMetadata.date}), ikke rapportdato.
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
              </div>
              <div className="flex items-center gap-3">
                {metadata.weatherFetchError ? (
                  <p className="text-sm text-destructive">{metadata.weatherFetchError}</p>
                ) : !weatherSnapshotForDate && (
                  <p className="text-sm text-muted-foreground">
                    Velg adresse i &quot;Forsideinformasjon&quot; for å hente værdata.
                  </p>
                )}
              </div>
              {weatherSnapshotForDate && (
                <div className="rounded-md border overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b">
                    <p className="text-sm font-medium">
                      Oppdragsdato: {weatherSnapshotForDate.date} · Viser time for time {String(weatherHourFrom).padStart(2, "0")}:00-{String(weatherHourTo).padStart(2, "0")}:00
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kilde: {weatherSnapshotForDate.sourceName} · {weatherSnapshotForDate.weatherEmoji} {weatherSnapshotForDate.weatherDescription}
                    </p>
                  </div>
                  {Array.isArray(weatherSnapshotForDate.warnings) && weatherSnapshotForDate.warnings.length > 0 && (
                    <div className="px-3 py-2 border-b bg-red-50 text-red-700 text-xs">
                      {weatherSnapshotForDate.warnings.map((warning, index) => (
                        <p key={`${warning}-${index}`}>{warning}</p>
                      ))}
                    </div>
                  )}
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Tid</TableHead>
                        <TableHead>Vær</TableHead>
                        <TableHead className="text-right">Temp °C</TableHead>
                        <TableHead className="text-right">Nedbør mm</TableHead>
                        <TableHead className="text-right">Snødybde cm</TableHead>
                        <TableHead className="text-right">Vind m/s</TableHead>
                        <TableHead className="text-right">Kraftigste vind m/s</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weatherHourlyRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Ingen timedata tilgjengelig for valgt tidsrom.
                          </TableCell>
                        </TableRow>
                      ) : (
                        weatherHourlyRows.map((row) => (
                          <TableRow key={`${row.date}-${row.hour}`}>
                            <TableCell>{row.timeLabel}</TableCell>
                            <TableCell>{row.weatherEmoji ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.temperatureC ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.precipitationMm ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.snowDepthCm ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.windMs ?? "-"}</TableCell>
                            <TableCell className="text-right">{row.maxWindMs ?? "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="px-3 py-2 border-t bg-slate-50 text-xs text-muted-foreground">
                    Døgnoppsummering: maks {weatherSnapshotForDate.maxTempC ?? "-"} °C, min{" "}
                    {weatherSnapshotForDate.minTempC ?? "-"} °C, gj.snitt{" "}
                    {weatherSnapshotForDate.avgTempC ?? "-"} °C, normal{" "}
                    {weatherSnapshotForDate.normalTempC ?? "-"} °C, nedbør{" "}
                    {weatherSnapshotForDate.precipitationMm ?? "-"} mm.
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
