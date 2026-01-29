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

  const getStatusColor = (lex8h: number | "", peak: number | "") => {
    if (lex8h === "" && peak === "") return "bg-transparent";
    const l = Number(lex8h);
    const p = Number(peak);
    if ((l > thresholds.lex8h.red) || (p > thresholds.peak.red)) return "bg-red-50 text-red-900";
    if (l > thresholds.lex8h.orange) return "bg-orange-50 text-orange-900";
    if ((l > thresholds.lex8h.yellow) || (p > thresholds.peak.yellow)) return "bg-yellow-50 text-yellow-900";
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
              <TableHead className="text-right">LAeq</TableHead>
              <TableHead className="text-right">LPeak</TableHead>
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
                const rowClass = getStatusColor(m.lex8h, m.maxPeak);
                return (
                  <TableRow key={m.id} className={cn(rowClass)}>
                    <TableCell className="font-medium">{m.location}</TableCell>
                    <TableCell>{m.duration}</TableCell>
                    <TableCell className="text-right font-mono">{m.lex8h}</TableCell>
                    <TableCell className="text-right font-mono">{m.maxPeak}</TableCell>
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
