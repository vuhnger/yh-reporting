"use client";

import { useWizard } from "./wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CalendarDays, User } from "lucide-react";
import type { ReportType } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";

export function ReviewStep() {
  const { state } = useWizard();

  const template = state.reportType
    ? getTemplate(state.reportType as ReportType)
    : undefined;

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
                <h3 className="font-semibold flex items-center gap-2 text-primary"><CalendarDays className="h-4 w-4"/> Utførelse</h3>
                <div className="text-sm space-y-1">
                    <p><span className="font-medium text-muted-foreground">Dato:</span> {state.sharedMetadata.date}</p>
                    <p><span className="font-medium text-muted-foreground">Forfatter:</span> {state.sharedMetadata.author}</p>
                </div>
            </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-primary"><User className="h-4 w-4"/> Rapportdetaljer</h3>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><span className="font-medium text-muted-foreground">Deltakere:</span> {state.sharedMetadata.participants}</p>
            <p><span className="font-medium text-muted-foreground">Kontaktperson:</span> {state.sharedMetadata.contactPerson}</p>
            <p><span className="font-medium text-muted-foreground">Rapport sendt til:</span> {state.sharedMetadata.reportSentTo}</p>
            <p><span className="font-medium text-muted-foreground">KAM/HMS-rådgiver:</span> {state.sharedMetadata.advisor}</p>
            <p><span className="font-medium text-muted-foreground">Dato for rapport:</span> {state.sharedMetadata.reportDate}</p>
          </div>
        </div>

        {/* Template-specific review section */}
        {template && <template.ReviewComponent />}

      </CardContent>
    </Card>
  );
}
