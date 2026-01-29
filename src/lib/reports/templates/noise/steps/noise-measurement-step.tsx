"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import type { Measurement } from "../schema";
import { getNoiseData } from "../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoiseMeasurementStep() {
  const { state, addMeasurement, updateMeasurement, removeMeasurement } = useWizard();
  const noise = getNoiseData(state);
  if (!noise) return null;

  const { measurements, thresholds } = noise;

  const getStatusColor = (lex8h: number | "", peak: number | "") => {
    if (lex8h === "" && peak === "") return "bg-transparent";
    const l = Number(lex8h);
    const p = Number(peak);
    if ((l > thresholds.lex8h.red) || (p > thresholds.peak.red)) {
      return "bg-red-100 text-red-900 border-red-200";
    }
    if (l > thresholds.lex8h.orange) {
      return "bg-orange-100 text-orange-900 border-orange-200";
    }
    if ((l > thresholds.lex8h.yellow) || (p > thresholds.peak.yellow)) {
      return "bg-yellow-100 text-yellow-900 border-yellow-200";
    }
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
            <CardTitle className="text-2xl text-primary">Støymålinger (Noise Measurements)</CardTitle>
            <CardDescription>
              Legg inn måleresultater. Fargene oppdateres automatisk basert på grenseverdier.
            </CardDescription>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded-full"></span> &gt;85 dB</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded-full"></span> &gt;80 dB</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-full"></span> &gt;70 dB</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[250px]">Målested (Location)</TableHead>
                <TableHead className="w-[150px]">Varighet</TableHead>
                <TableHead className="w-[120px] text-right">LAeq (dB)</TableHead>
                <TableHead className="w-[120px] text-right">LPeak (dB)</TableHead>
                <TableHead>Kommentar</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map((m) => {
                const statusColor = getStatusColor(m.lex8h, m.maxPeak);
                return (
                  <TableRow key={m.id} className={cn("transition-colors", statusColor !== "bg-transparent" && statusColor)}>
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
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        placeholder="-"
                        value={m.lex8h}
                        onChange={(e) => handleValueChange(m.id, "lex8h", e.target.value)}
                        className="text-right bg-white/50 border-transparent focus:bg-white focus:border-input font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-right">
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
