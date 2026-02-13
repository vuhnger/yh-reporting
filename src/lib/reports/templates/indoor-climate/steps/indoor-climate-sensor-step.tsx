"use client";

import { useEffect, useMemo, useState } from "react";
import type { Instrument } from "@/app/api/instruments/route";
import { useWizard } from "@/components/wizard/wizard-context";
import { AIFillButton } from "@/components/wizard/ai-fill-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageTextarea } from "@/components/ui/image-textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getIndoorClimateData,
  type IndoorClimateInstrument,
  type IndoorClimateMetricStats,
  type IndoorClimateSensor,
} from "../schema";

type MetricKey = "temperature" | "humidity" | "co2";
type BoundKey = "min" | "max" | "avg";

interface InstrumentOption extends Instrument {
  optionId: string;
}

function toInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseNumberInput(raw: string): number | null {
  if (!raw.trim()) return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isAverageValid(stats: IndoorClimateMetricStats): boolean {
  if (stats.min === null || stats.max === null || stats.avg === null) return true;
  const lower = Math.min(stats.min, stats.max);
  const upper = Math.max(stats.min, stats.max);
  return stats.avg >= lower && stats.avg <= upper;
}

function createManualInstrument(sensorId: string): IndoorClimateInstrument {
  return {
    id: `manual-${sensorId}-${Date.now()}`,
    hva: "",
    modell: "",
    serienr: "",
    sistKalibrert: null,
    kilde: "manuell",
    innkjopsar: "",
    programvareNavn: "",
    programvareVersjon: "",
  };
}

function InstrumentFields({
  sensor,
  onChange,
}: {
  sensor: IndoorClimateSensor;
  onChange: (instrument: IndoorClimateInstrument | null) => void;
}) {
  const instrument = sensor.instrument;
  if (!instrument || instrument.kilde !== "manuell") return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded border p-3 bg-slate-50/50">
      <div className="space-y-1">
        <Label>Instrumentnavn</Label>
        <Input
          value={instrument.hva}
          onChange={(e) => onChange({ ...instrument, hva: e.target.value })}
          placeholder="F.eks. Inneklimamaler"
        />
      </div>
      <div className="space-y-1">
        <Label>Modell</Label>
        <Input
          value={instrument.modell}
          onChange={(e) => onChange({ ...instrument, modell: e.target.value })}
          placeholder="Modell"
        />
      </div>
      <div className="space-y-1">
        <Label>Serienr</Label>
        <Input
          value={instrument.serienr}
          onChange={(e) => onChange({ ...instrument, serienr: e.target.value })}
          placeholder="Serienummer"
        />
      </div>
      <div className="space-y-1">
        <Label>Sist kalibrert</Label>
        <Input
          type="date"
          value={instrument.sistKalibrert ?? ""}
          onChange={(e) => onChange({ ...instrument, sistKalibrert: e.target.value || null })}
        />
      </div>
    </div>
  );
}

function SensorImageField({
  label,
  image,
  caption,
  onImageChange,
  onCaptionChange,
}: {
  label: string;
  image: string | null;
  caption: string;
  onImageChange: (image: string | null) => void;
  onCaptionChange: (caption: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ImageTextarea
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Bildetekst"
        imageSrc={image ?? undefined}
        onImageChange={onImageChange}
        className="min-h-[100px]"
      />
    </div>
  );
}

export function IndoorClimateSensorStep() {
  const { state, addSensor, updateSensor, removeSensor } = useWizard();
  const indoor = getIndoorClimateData(state);

  const [options, setOptions] = useState<InstrumentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInstruments() {
      try {
        const response = await fetch("/api/instruments");
        if (!response.ok) throw new Error("Kunne ikke hente instrumenter.");
        const data = await response.json();
        if (cancelled) return;
        const mapped = (data.instruments as Instrument[]).map((instrument, index) => ({
          ...instrument,
          optionId: `sheet-${index}-${instrument.serienr || instrument.hva}`,
        }));
        setOptions(mapped);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Ukjent feil.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInstruments();
    return () => {
      cancelled = true;
    };
  }, []);

  const optionById = useMemo(() => {
    const map = new Map<string, InstrumentOption>();
    for (const option of options) {
      map.set(option.optionId, option);
    }
    return map;
  }, [options]);

  if (!indoor) return null;
  const sensors = indoor.metadata.sensors;

  const updateMetric = (
    sensor: IndoorClimateSensor,
    metric: MetricKey,
    bound: BoundKey,
    rawValue: string
  ) => {
    const nextStats = {
      ...sensor.stats,
      [metric]: {
        ...sensor.stats[metric],
        [bound]: parseNumberInput(rawValue),
      },
    };
    updateSensor(sensor.id, { stats: nextStats });
  };

  const updateInterpretation = (
    sensor: IndoorClimateSensor,
    key: keyof IndoorClimateSensor["interpretation"],
    value: string
  ) => {
    updateSensor(sensor.id, {
      interpretation: {
        ...sensor.interpretation,
        [key]: value,
      },
    });
  };

  const updateImage = async (
    sensor: IndoorClimateSensor,
    key: "placementImage" | "sensorReportImage" | "chartImage",
    image: string | null
  ) => {
    if (image !== null) {
      updateSensor(sensor.id, { [key]: image });
      return;
    }
    updateSensor(sensor.id, { [key]: null });
  };

  const handleInstrumentChange = (sensor: IndoorClimateSensor, selectedValue: string) => {
    if (selectedValue === "none") {
      updateSensor(sensor.id, { instrument: null });
      return;
    }

    if (selectedValue === "manual") {
      updateSensor(sensor.id, { instrument: createManualInstrument(sensor.id) });
      return;
    }

    const option = optionById.get(selectedValue);
    if (!option) return;

    updateSensor(sensor.id, {
      instrument: {
        id: option.optionId,
        hva: option.hva,
        modell: option.modell,
        serienr: option.serienr,
        sistKalibrert: option.sistKalibrert,
        kilde: "sheets",
        innkjopsar: "",
        programvareNavn: option.programvare,
        programvareVersjon: "",
      },
    });
  };

  return (
    <Card className="w-full max-w-6xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Inneklimamalere</CardTitle>
        <CardDescription>
          Legg til en eller flere malere med instrument, plassering, statistikk og tolkning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Henter instrumentoversikt...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {sensors.map((sensor, index) => {
          const temperatureValid = isAverageValid(sensor.stats.temperature);
          const humidityValid = isAverageValid(sensor.stats.humidity);
          const co2Valid = isAverageValid(sensor.stats.co2);
          const selectedInstrument =
            sensor.instrument?.kilde === "manuell"
              ? "manual"
              : sensor.instrument?.id ?? "none";
          const sensorTableLabel =
            sensor.instrument?.hva?.trim() ||
            sensor.locationName.trim() ||
            "Maler";

          return (
            <div key={sensor.id} className="rounded-lg border p-4 space-y-6 bg-white">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-primary">
                  Inneklimamaler {index + 1}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeSensor(sensor.id)}>
                  Fjern maler
                </Button>
              </div>

              <section className="space-y-3">
                <div className="space-y-2">
                  <Label>1. Velg maler</Label>
                  <Select value={selectedInstrument} onValueChange={(value) => handleInstrumentChange(sensor, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg instrument" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen valgt</SelectItem>
                      {options.map((option) => (
                        <SelectItem key={option.optionId} value={option.optionId}>
                          {option.hva} {option.serienr ? `· ${option.serienr}` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">Legg inn manuelt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <InstrumentFields
                  sensor={sensor}
                  onChange={(instrument) => updateSensor(sensor.id, { instrument })}
                />

                {sensor.instrument && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Innkjopsar (valgfritt)</Label>
                      <Input
                        value={sensor.instrument.innkjopsar ?? ""}
                        onChange={(e) =>
                          updateSensor(sensor.id, {
                            instrument: { ...sensor.instrument!, innkjopsar: e.target.value },
                          })
                        }
                        placeholder="F.eks. 2022"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Programvare navn (valgfritt)</Label>
                      <Input
                        value={sensor.instrument.programvareNavn ?? ""}
                        onChange={(e) =>
                          updateSensor(sensor.id, {
                            instrument: { ...sensor.instrument!, programvareNavn: e.target.value },
                          })
                        }
                        placeholder="Programvarenavn"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Programvare versjon (valgfritt)</Label>
                      <Input
                        value={sensor.instrument.programvareVersjon ?? ""}
                        onChange={(e) =>
                          updateSensor(sensor.id, {
                            instrument: { ...sensor.instrument!, programvareVersjon: e.target.value },
                          })
                        }
                        placeholder="F.eks. 2.1.0"
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>2. Lokasjonsnavn</Label>
                  <Input
                    value={sensor.locationName}
                    onChange={(e) => updateSensor(sensor.id, { locationName: e.target.value })}
                    placeholder="F.eks. Kontorlandskap 2. etasje"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plasseringsbeskrivelse</Label>
                  <Input
                    value={sensor.placementDescription}
                    onChange={(e) => updateSensor(sensor.id, { placementDescription: e.target.value })}
                    placeholder="Fritekst om plassering og mulige feilkilder"
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SensorImageField
                  label="3. Bilde av malerplassering"
                  image={sensor.placementImage}
                  caption={sensor.placementImageCaption}
                  onImageChange={(image) => updateImage(sensor, "placementImage", image)}
                  onCaptionChange={(caption) => updateSensor(sensor.id, { placementImageCaption: caption })}
                />
                <SensorImageField
                  label="4. Bilde av maler-rapport"
                  image={sensor.sensorReportImage}
                  caption={sensor.sensorReportImageCaption}
                  onImageChange={(image) => updateImage(sensor, "sensorReportImage", image)}
                  onCaptionChange={(caption) => updateSensor(sensor.id, { sensorReportImageCaption: caption })}
                />
                <SensorImageField
                  label="5. Graf/figur"
                  image={sensor.chartImage}
                  caption={sensor.chartCaption}
                  onImageChange={(image) => updateImage(sensor, "chartImage", image)}
                  onCaptionChange={(caption) => updateSensor(sensor.id, { chartCaption: caption })}
                />
              </section>

              <section className="space-y-3">
                <Label>6. Tabell med malinger</Label>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>{sensorTableLabel}</TableHead>
                        <TableHead className="text-right">Temperatur (C)</TableHead>
                        <TableHead className="text-right">Relativ luftfuktighet (%RH)</TableHead>
                        <TableHead className="text-right">CO2 (ppm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(["min", "max", "avg"] as BoundKey[]).map((bound) => (
                        <TableRow key={bound}>
                          <TableCell className="font-medium uppercase">{bound}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={toInputValue(sensor.stats.temperature[bound])}
                              onChange={(e) => updateMetric(sensor, "temperature", bound, e.target.value)}
                              className={`text-right ${bound === "avg" && !temperatureValid ? "border-destructive" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={toInputValue(sensor.stats.humidity[bound])}
                              onChange={(e) => updateMetric(sensor, "humidity", bound, e.target.value)}
                              className={`text-right ${bound === "avg" && !humidityValid ? "border-destructive" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={toInputValue(sensor.stats.co2[bound])}
                              onChange={(e) => updateMetric(sensor, "co2", bound, e.target.value)}
                              className={`text-right ${bound === "avg" && !co2Valid ? "border-destructive" : ""}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {(!temperatureValid || !humidityValid || !co2Valid) && (
                  <p className="text-sm text-destructive">
                    Avg ma ligge mellom min og max for alle parametere.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <Label>7. Tolkningsavsnitt</Label>
                <div className="grid grid-cols-1 gap-4">
                  <ImageTextarea
                    value={sensor.interpretation.temperatureText}
                    onChange={(e) => updateInterpretation(sensor, "temperatureText", e.target.value)}
                    placeholder="Temperatur: verdiomrade, grenseverdier, dognvariasjon og anbefalinger."
                    className="min-h-[120px] pr-10"
                    actions={
                      <AIFillButton
                        reportType="indoor-climate"
                        field="sensor_temperatureText"
                        state={state}
                        getValue={() => sensor.interpretation.temperatureText}
                        setValue={(text) => updateInterpretation(sensor, "temperatureText", text)}
                        contextPatch={{
                          targetSensorId: sensor.id,
                          targetSensorLocation: sensor.locationName,
                        }}
                      />
                    }
                  />
                  <ImageTextarea
                    value={sensor.interpretation.humidityText}
                    onChange={(e) => updateInterpretation(sensor, "humidityText", e.target.value)}
                    placeholder="Luftfuktighet: verdiomrade, forklaringer, konsekvenser og anbefalinger."
                    className="min-h-[120px] pr-10"
                    actions={
                      <AIFillButton
                        reportType="indoor-climate"
                        field="sensor_humidityText"
                        state={state}
                        getValue={() => sensor.interpretation.humidityText}
                        setValue={(text) => updateInterpretation(sensor, "humidityText", text)}
                        contextPatch={{
                          targetSensorId: sensor.id,
                          targetSensorLocation: sensor.locationName,
                        }}
                      />
                    }
                  />
                  <ImageTextarea
                    value={sensor.interpretation.co2Text}
                    onChange={(e) => updateInterpretation(sensor, "co2Text", e.target.value)}
                    placeholder="CO2: verdiomrade, vurdering mot 1000 ppm og ventilasjonskapasitet."
                    className="min-h-[120px] pr-10"
                    actions={
                      <AIFillButton
                        reportType="indoor-climate"
                        field="sensor_co2Text"
                        state={state}
                        getValue={() => sensor.interpretation.co2Text}
                        setValue={(text) => updateInterpretation(sensor, "co2Text", text)}
                        contextPatch={{
                          targetSensorId: sensor.id,
                          targetSensorLocation: sensor.locationName,
                        }}
                      />
                    }
                  />
                </div>
              </section>
            </div>
          );
        })}

        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={addSensor} className="border-dashed">
            Legg til maler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
