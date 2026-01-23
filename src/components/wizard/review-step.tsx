"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Calendar, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewStep() {
  const { state, nextStep, prevStep } = useWizard();

  // Helper to determine color (duplicated from MeasurementStep for consistent preview)
  const getStatusColor = (lex8h: number | "", peak: number | "") => {
    if (lex8h === "" && peak === "") return "bg-transparent";
    const { thresholds } = state;
    const l = Number(lex8h);
    const p = Number(peak);
    if ((l > thresholds.lex8h.red) || (p > thresholds.peak.red)) return "bg-red-50 text-red-900";
    if (l > thresholds.lex8h.orange) return "bg-orange-50 text-orange-900";
    if ((l > thresholds.lex8h.yellow) || (p > thresholds.peak.yellow)) return "bg-yellow-50 text-yellow-900";
    return "bg-green-50 text-green-900";
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Se over rapport</CardTitle>
        <CardDescription>Kontroller at alle opplysninger er korrekte før generering.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Project Context Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-primary"><Building2 className="h-4 w-4"/> Bedrift</h3>
                <div className="text-sm space-y-1">
                    <p><span className="font-medium text-muted-foreground">Navn:</span> {state.client.name}</p>
                    <p><span className="font-medium text-muted-foreground">Org.nr:</span> {state.client.orgNr}</p>
                    <p><span className="font-medium text-muted-foreground">Adresse:</span> {state.client.address}</p>
                </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-primary"><ClipboardList className="h-4 w-4"/> Oppdrag</h3>
                <div className="text-sm space-y-1">
                    <p><span className="font-medium text-muted-foreground">Tittel:</span> {state.metadata.assignment}</p>
                    <p><span className="font-medium text-muted-foreground">Dato:</span> {state.metadata.date}</p>
                    <p><span className="font-medium text-muted-foreground">Forfatter:</span> {state.metadata.author}</p>
                </div>
            </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-primary"><User className="h-4 w-4"/> Rapportdetaljer</h3>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><span className="font-medium text-muted-foreground">Deltakere:</span> {state.metadata.participants}</p>
            <p><span className="font-medium text-muted-foreground">Kontaktperson:</span> {state.metadata.contactPerson}</p>
            <p><span className="font-medium text-muted-foreground">Rapport sendt til:</span> {state.metadata.reportSentTo}</p>
            <p><span className="font-medium text-muted-foreground">KAM/HMS-rådgiver:</span> {state.metadata.advisor}</p>
            <p><span className="font-medium text-muted-foreground">Dato for rapport:</span> {state.metadata.reportDate}</p>
            <p><span className="font-medium text-muted-foreground">Antall vedlegg:</span> {state.files.length}</p>
          </div>
        </div>

        {/* Measurements Table Summary */}
        <div className="space-y-2">
          <Label className="text-lg font-semibold text-primary">Måleresultater ({state.measurements.length})</Label>
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
                {state.measurements.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            Ingen målinger registrert.
                        </TableCell>
                    </TableRow>
                ) : (
                    state.measurements.map((m) => {
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

      </CardContent>
      {/* Footer removed for single-page layout */}
    </Card>
  );
}
