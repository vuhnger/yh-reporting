"use client";

import { useState } from "react";
import { useWizard } from "@/components/wizard/wizard-context";
import type { Measurement } from "../schema";
import { getMeasurementLabel, getNoiseData } from "../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoiseMeasurementStep() {
  const { state, addMeasurement, updateMeasurement, removeMeasurement, updateNoiseMetadata, updateThresholds } = useWizard();
  const noise = getNoiseData(state);
  const [invalidNumericFields, setInvalidNumericFields] = useState<Record<string, boolean>>({});
  if (!noise) return null;

  const { measurements, thresholds } = noise;

  const noiseGroupYellow = {
    I: 45,
    II: 60,
    III: 75,
  } as const;

  const handleNoiseGroupChange = (group: "I" | "II" | "III") => {
    const yellowThreshold = noiseGroupYellow[group];
    updateNoiseMetadata({ noiseGroup: group });
    updateThresholds({
      lex8h: {
        red: 85,
        orange: 80,
        yellow: yellowThreshold,
      },
      peak: {
        red: 130,
        yellow: 120,
      },
    });
  };

  const getLexColor = (lex8h: number | "") => {
    if (lex8h === "") return "border-border bg-background";
    const l = Number(lex8h);
    if (l > thresholds.lex8h.red) return "border-red-200 bg-red-50 text-red-900";
    if (l > thresholds.lex8h.orange) return "border-orange-200 bg-orange-50 text-orange-900";
    if (l > thresholds.lex8h.yellow) return "border-yellow-200 bg-yellow-50 text-yellow-900";
    return "border-green-200 bg-green-50 text-green-900";
  };

  const getPeakColor = (peak: number | "") => {
    if (peak === "") return "border-border bg-background";
    const p = Number(peak);
    if (p > thresholds.peak.red) return "border-red-200 bg-red-50 text-red-900";
    if (p > thresholds.peak.yellow) return "border-yellow-200 bg-yellow-50 text-yellow-900";
    return "border-green-200 bg-green-50 text-green-900";
  };

  const setNumericFieldValidity = (id: string, field: "lex8h" | "maxPeak", isInvalid: boolean) => {
    const key = `${id}:${field}`;

    setInvalidNumericFields((prev) => {
      if (isInvalid) {
        return { ...prev, [key]: true };
      }

      if (!(key in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleValueChange = (id: string, field: keyof Measurement, value: string, isBadInput = false) => {
    if (value === "") {
      if (field === "lex8h" || field === "maxPeak") {
        setNumericFieldValidity(id, field, false);
      }
      updateMeasurement(id, { [field]: "" });
      return;
    }

    if (field === "lex8h" || field === "maxPeak") {
      if (isBadInput || Number.isNaN(Number(value))) {
        setNumericFieldValidity(id, field, true);
        updateMeasurement(id, { [field]: "" });
        return;
      }

      setNumericFieldValidity(id, field, false);
      updateMeasurement(id, { [field]: Number(value) });
      return;
    }

    updateMeasurement(id, { [field]: value });
  };

  return (
    <Card className="mx-auto w-full max-w-6xl border-primary/20 shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-2xl text-primary">Støymålinger</CardTitle>
            <CardDescription>
              Hver boks under er én måling. Bruk &quot;Legg til måling&quot; når du vil registrere måling 2, 3, 4 og videre for samme arbeidssted.
            </CardDescription>
          </div>

          <div className="flex max-w-md flex-col items-start gap-2 lg:items-end">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Støygruppe</Label>
              <Select
                value={noise.metadata.noiseGroup}
                onValueChange={(value) => handleNoiseGroupChange(value as "I" | "II" | "III")}
              >
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Velg støygruppe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">Støygruppe I (Maks 55 dB(A), LAeq,1h)</SelectItem>
                  <SelectItem value="II">Støygruppe II (Maks 70 dB(A), LAeq,1h)</SelectItem>
                  <SelectItem value="III">Støygruppe III (Maks 85 dB(A), LAeq,8h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Gruppe I/II gjelder normert ekvivalentnivå over 1 time. Gruppe III gjelder normert ekvivalentnivå over 8 timer.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground lg:justify-end">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-red-200 bg-red-100"></span> &gt;{thresholds.lex8h.red} dB A</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-orange-200 bg-orange-100"></span> &gt;{thresholds.lex8h.orange} dB A</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-yellow-200 bg-yellow-100"></span> &gt;{thresholds.lex8h.yellow} dB A</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          Tips: Når du legger til en ny måling, kopieres arbeidsstedet fra forrige måling. Det gjør det raskere å registrere flere målinger fra samme sted.
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {measurements.length === 0 ? (
          <div className="rounded-lg border border-dashed px-6 py-10 text-center text-muted-foreground">
            Ingen målinger lagt til enda. Klikk &quot;Legg til måling&quot; for å starte.
          </div>
        ) : (
          measurements.map((measurement, index) => {
            const lexColor = getLexColor(measurement.lex8h);
            const peakColor = getPeakColor(measurement.maxPeak);
            const hasInvalidLex = Boolean(invalidNumericFields[`${measurement.id}:lex8h`]);
            const hasInvalidPeak = Boolean(invalidNumericFields[`${measurement.id}:maxPeak`]);

            return (
              <div key={measurement.id} className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">{getMeasurementLabel(index)}</p>
                    <p className="text-sm text-muted-foreground">
                      Registrer arbeidssted, varighet og målte nivåer for denne målingen.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMeasurement(measurement.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Fjern ${getMeasurementLabel(index).toLowerCase()}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor={`location-${measurement.id}`}>Arbeidssted</Label>
                    <Input
                      id={`location-${measurement.id}`}
                      placeholder="F.eks. GC-MS rom"
                      value={measurement.location}
                      onChange={(e) => handleValueChange(measurement.id, "location", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`duration-${measurement.id}`}>Varighet</Label>
                    <Input
                      id={`duration-${measurement.id}`}
                      placeholder="F.eks. 1 min 30 sek"
                      value={measurement.duration}
                      onChange={(e) => handleValueChange(measurement.id, "duration", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Oppsummering</Label>
                    <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                      {measurement.location.trim() || "Arbeidssted ikke angitt"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`lex-${measurement.id}`}>LAeq (dB A)</Label>
                    <Input
                      id={`lex-${measurement.id}`}
                      type="number"
                      placeholder="-"
                      value={measurement.lex8h}
                      onChange={(e) =>
                        handleValueChange(
                          measurement.id,
                          "lex8h",
                          e.target.value,
                          e.currentTarget.validity.badInput
                        )
                      }
                      className={cn("font-mono", lexColor, hasInvalidLex && "border-destructive text-destructive")}
                    />
                    {hasInvalidLex ? <p className="text-sm text-destructive">Skriv inn et gyldig tall.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`peak-${measurement.id}`}>LCpeak (dB C)</Label>
                    <Input
                      id={`peak-${measurement.id}`}
                      type="number"
                      placeholder="-"
                      value={measurement.maxPeak}
                      onChange={(e) =>
                        handleValueChange(
                          measurement.id,
                          "maxPeak",
                          e.target.value,
                          e.currentTarget.validity.badInput
                        )
                      }
                      className={cn("font-mono", peakColor, hasInvalidPeak && "border-destructive text-destructive")}
                    />
                    {hasInvalidPeak ? <p className="text-sm text-destructive">Skriv inn et gyldig tall.</p> : null}
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-2">
                    <Label htmlFor={`comment-${measurement.id}`}>Kommentar</Label>
                    <Textarea
                      id={`comment-${measurement.id}`}
                      placeholder="Valgfri kommentar om hva som skjedde under målingen."
                      value={measurement.comment}
                      onChange={(e) => handleValueChange(measurement.id, "comment", e.target.value)}
                      className="min-h-[96px]"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={addMeasurement} className="w-full max-w-xs border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Legg til måling
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
