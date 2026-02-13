"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import type { Measurement } from "../schema";
import { getNoiseData } from "../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoiseMeasurementStep() {
  const { state, addMeasurement, updateMeasurement, removeMeasurement, updateNoiseMetadata, updateThresholds } = useWizard();
  const noise = getNoiseData(state);
  if (!noise) return null;

  const { measurements, thresholds } = noise;

  // Anbefalt nivå = 10 dB under gruppemaks iht. Arbeidstilsynet
  const noiseGroupYellow = {
    I: 45,  // 10 dB under maks 55 dB
    II: 60, // 10 dB under maks 70 dB
    III: 75, // 10 dB under maks 85 dB
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
    if (lex8h === "") return "bg-transparent";
    const l = Number(lex8h);
    if (l > thresholds.lex8h.red) return "bg-red-100 text-red-900 border-red-200";
    if (l > thresholds.lex8h.orange) return "bg-orange-100 text-orange-900 border-orange-200";
    if (l > thresholds.lex8h.yellow) return "bg-yellow-100 text-yellow-900 border-yellow-200";
    return "bg-green-100 text-green-900 border-green-200";
  };

  const getPeakColor = (peak: number | "") => {
    if (peak === "") return "bg-transparent";
    const p = Number(peak);
    if (p > thresholds.peak.red) return "bg-red-100 text-red-900 border-red-200";
    if (p > thresholds.peak.yellow) return "bg-yellow-100 text-yellow-900 border-yellow-200";
    return "bg-green-100 text-green-900 border-green-200";
  };

  const handleValueChange = (id: string, field: keyof Measurement, value: string) => {
    if (value === "") {
      updateMeasurement(id, { [field]: "" });
      return;
    }
    if ((field === "lex8h" || field === "maxPeak") && !isNaN(Number(value))) {
      updateMeasurement(id, { [field]: Number(value) });
    } else if (field !== "lex8h" && field !== "maxPeak") {
      updateMeasurement(id, { [field]: value });
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl text-primary">Støymålinger</CardTitle>
            <CardDescription>
              Legg inn måleresultater. Fargene oppdateres automatisk basert på grenseverdier.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
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
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded-full"></span> &gt;{thresholds.lex8h.red} dB A</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded-full"></span> &gt;{thresholds.lex8h.orange} dB A</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-full"></span> &gt;{thresholds.lex8h.yellow} dB A</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[250px]">Målested</TableHead>
                <TableHead className="w-[150px]">Varighet</TableHead>
                <TableHead className="w-[120px] text-right">LAeq (dB A)</TableHead>
                <TableHead className="w-[120px] text-right">LCpeak (dB C)</TableHead>
                <TableHead>Kommentar</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map((m) => {
                const lexColor = getLexColor(m.lex8h);
                const peakColor = getPeakColor(m.maxPeak);
                return (
                  <TableRow key={m.id} className="transition-colors">
                    <TableCell>
                      <Input
                        placeholder="F.eks. Vannlab"
                        value={m.location}
                        onChange={(e) => handleValueChange(m.id, "location", e.target.value)}
                        className="bg-white/50 border-transparent focus:bg-white focus:border-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="F.eks. 1t 30m"
                        value={m.duration}
                        onChange={(e) => handleValueChange(m.id, "duration", e.target.value)}
                        className="bg-white/50 border-transparent focus:bg-white focus:border-input"
                      />
                    </TableCell>
                    <TableCell className={cn("text-right", lexColor !== "bg-transparent" && lexColor)}>
                      <Input
                        type="number"
                        placeholder="-"
                        value={m.lex8h}
                        onChange={(e) => handleValueChange(m.id, "lex8h", e.target.value)}
                        className="text-right bg-white/50 border-transparent focus:bg-white focus:border-input font-mono"
                      />
                    </TableCell>
                    <TableCell className={cn("text-right", peakColor !== "bg-transparent" && peakColor)}>
                      <Input
                        type="number"
                        placeholder="-"
                        value={m.maxPeak}
                        onChange={(e) => handleValueChange(m.id, "maxPeak", e.target.value)}
                        className="text-right bg-white/50 border-transparent focus:bg-white focus:border-input font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Valgfri kommentar..."
                        value={m.comment}
                        onChange={(e) => handleValueChange(m.id, "comment", e.target.value)}
                        className="bg-white/50 border-transparent focus:bg-white focus:border-input"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeMeasurement(m.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {measurements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Ingen målinger lagt til enda. Klikk &quot;Legg til måling&quot; for å starte.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={addMeasurement} className="w-full max-w-xs border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Legg til måling
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
