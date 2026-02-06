"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import { getNoiseData } from "../schema";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function NoiseReviewSection() {
  const { state } = useWizard();
  const noise = getNoiseData(state);
  if (!noise) return null;

  const { measurements, thresholds } = noise;

  const getLexColor = (lex8h: number | "") => {
    if (lex8h === "") return "bg-transparent";
    const l = Number(lex8h);
    if (l > thresholds.lex8h.red) return "bg-red-50 text-red-900";
    if (l > thresholds.lex8h.orange) return "bg-orange-50 text-orange-900";
    if (l > thresholds.lex8h.yellow) return "bg-yellow-50 text-yellow-900";
    return "bg-green-50 text-green-900";
  };

  const getPeakColor = (peak: number | "") => {
    if (peak === "") return "bg-transparent";
    const p = Number(peak);
    if (p > thresholds.peak.red) return "bg-red-50 text-red-900";
    if (p > thresholds.peak.yellow) return "bg-yellow-50 text-yellow-900";
    return "bg-green-50 text-green-900";
  };

  return (
    <div className="space-y-2">
      <Label className="text-lg font-semibold text-primary">Måleresultater ({measurements.length})</Label>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Målested</TableHead>
              <TableHead>Varighet</TableHead>
              <TableHead className="text-right">LAeq (dB A)</TableHead>
              <TableHead className="text-right">LCpeak (dB C)</TableHead>
              <TableHead>Kommentar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {measurements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Ingen målinger registrert.
                </TableCell>
              </TableRow>
            ) : (
              measurements.map((m) => {
                const lexClass = getLexColor(m.lex8h);
                const peakClass = getPeakColor(m.maxPeak);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.location}</TableCell>
                    <TableCell>{m.duration}</TableCell>
                    <TableCell className={cn("text-right font-mono", lexClass !== "bg-transparent" && lexClass)}>{m.lex8h}</TableCell>
                    <TableCell className={cn("text-right font-mono", peakClass !== "bg-transparent" && peakClass)}>{m.maxPeak}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={m.comment}>{m.comment}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
