"use client";

import { useEffect, useId, useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageTextarea } from "@/components/ui/image-textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AIFillButton } from "@/components/wizard/ai-fill-button";
import {
  INDOOR_CLIMATE_REFERENCES,
  getIndoorClimateData,
} from "../schema";

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        reject(new Error("Kunne ikke lese bildefil."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Ukjent filfeil."));
    reader.readAsDataURL(file);
  });
}

export function IndoorClimateMetadataStep() {
  const { state, updateIndoorClimateMetadata } = useWizard();
  const indoor = getIndoorClimateData(state);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const customerImageInputId = useId();

  useEffect(() => {
    if (!indoor) return;
    if (indoor.metadata.weatherDate === state.sharedMetadata.date) return;
    updateIndoorClimateMetadata({ weatherDate: state.sharedMetadata.date });
  }, [indoor, state.sharedMetadata.date, updateIndoorClimateMetadata]);

  if (!indoor) return null;
  const metadata = indoor.metadata;

  const recommendationsText = metadata.recommendations.join("\n");
  const manualReferencesText = metadata.manualReferences.join("\n");

  const onCustomerImageChange = async (file: File | null) => {
    if (!file) {
      updateIndoorClimateMetadata({ customerWebsiteImage: null });
      return;
    }
    try {
      const image = await readImageAsDataUrl(file);
      updateIndoorClimateMetadata({ customerWebsiteImage: image });
    } catch (error) {
      console.error(error);
      alert("Kunne ikke lese bilde.");
    }
  };

  const fetchWeather = async () => {
    const address = (metadata.weatherAddress || state.client.address || "").trim();
    if (!address) {
      setWeatherError("Legg inn adresse for vaeroppslag.");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const params = new URLSearchParams({
        address,
        date: state.sharedMetadata.date,
      });
      const response = await fetch(`/api/weather?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        setWeatherError(payload?.error || "Kunne ikke hente vaerdata.");
        return;
      }

      updateIndoorClimateMetadata({
        weatherAddress: address,
        weatherDate: state.sharedMetadata.date,
        weatherSnapshot: payload,
      });
    } catch (error) {
      console.error(error);
      setWeatherError("Kunne ikke hente vaerdata.");
    } finally {
      setWeatherLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Inneklima - detaljer</CardTitle>
        <CardDescription>
          Fyll ut innhold for forsidetekst, metode, vaer og anbefalinger.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Kundens bilde</h3>
            <p className="text-xs text-muted-foreground">URL fra kundens nettside og bilde/logo for toppseksjonen.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-website-url">Nettside (valgfritt)</Label>
              <Input
                id="customer-website-url"
                value={metadata.customerWebsiteUrl}
                onChange={(e) => updateIndoorClimateMetadata({ customerWebsiteUrl: e.target.value })}
                placeholder="https://kunde.no"
              />
            </div>
            <div className="space-y-2">
              <Label>Bilde/logo</Label>
              <input
                id={customerImageInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onCustomerImageChange(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(customerImageInputId)?.click()}>
                  Last opp bilde
                </Button>
                {metadata.customerWebsiteImage && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onCustomerImageChange(null)}>
                    Fjern bilde
                  </Button>
                )}
              </div>
              {metadata.customerWebsiteImage && (
                <img
                  src={metadata.customerWebsiteImage}
                  alt="Kundebilde"
                  className="max-h-44 rounded border object-contain p-2 bg-white"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-image-caption">Bildetekst (valgfritt)</Label>
              <Input
                id="customer-image-caption"
                value={metadata.customerWebsiteImageCaption}
                onChange={(e) => updateIndoorClimateMetadata({ customerWebsiteImageCaption: e.target.value })}
                placeholder="Valgfri bildetekst"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Takketekst</h3>
            <p className="text-xs text-muted-foreground">Redigerbar standardtekst etter metadata-tabellen.</p>
          </div>
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
            <h3 className="text-lg font-semibold text-primary">Gjennomforing og metode</h3>
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
              <div key={`${index}-${item}`} className="flex items-center gap-2">
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
            <p className="text-xs text-muted-foreground">Standardreferanser vises alltid. Legg til egne ved behov.</p>
          </div>
          <div className="rounded-md border p-3 bg-slate-50">
            <ul className="list-disc pl-6 space-y-1 text-sm">
              {INDOOR_CLIMATE_REFERENCES.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-references">Manuelle referanser (en per linje)</Label>
            <Textarea
              id="manual-references"
              value={manualReferencesText}
              onChange={(e) =>
                updateIndoorClimateMetadata({ manualReferences: splitLines(e.target.value) })
              }
              className="min-h-[120px]"
            />
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
            <h3 className="text-lg font-semibold text-primary">Vaer</h3>
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
              Inkluder vaerdata
            </label>
          </div>
          {metadata.weatherInclude && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weather-address">Adresse i Norge</Label>
                  <Input
                    id="weather-address"
                    value={metadata.weatherAddress}
                    onChange={(e) => updateIndoorClimateMetadata({ weatherAddress: e.target.value })}
                    placeholder={state.client.address || "Skriv adresse"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weather-date">Dato for oppdrag</Label>
                  <Input id="weather-date" value={state.sharedMetadata.date} readOnly className="bg-slate-50" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={fetchWeather} disabled={weatherLoading}>
                  {weatherLoading ? "Henter..." : "Hent vaerdata"}
                </Button>
                {weatherError && <p className="text-sm text-destructive">{weatherError}</p>}
              </div>
              {metadata.weatherSnapshot && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Vaer</TableHead>
                        <TableHead className="text-right">Maks temp</TableHead>
                        <TableHead className="text-right">Min temp</TableHead>
                        <TableHead className="text-right">Gj.snitt</TableHead>
                        <TableHead className="text-right">Normal temp</TableHead>
                        <TableHead className="text-right">Nedbor</TableHead>
                        <TableHead className="text-right">Snodybde cm</TableHead>
                        <TableHead className="text-right">Vind m/s</TableHead>
                        <TableHead className="text-right">Kraftigste vind m/s</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          {metadata.weatherSnapshot.weatherEmoji} {metadata.weatherSnapshot.weatherDescription}
                        </TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.maxTempC ?? "-"}</TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.minTempC ?? "-"}</TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.avgTempC ?? "-"}</TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.normalTempC ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {metadata.weatherSnapshot.precipitationMm ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.snowDepthCm ?? "-"}</TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.avgWindMs ?? "-"}</TableCell>
                        <TableCell className="text-right">{metadata.weatherSnapshot.maxWindMs ?? "-"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
