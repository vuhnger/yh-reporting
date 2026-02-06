"use client";

import { useEffect } from "react";
import { useWizard } from "./wizard-context";
import type { ReportType } from "@/lib/reports/template-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SharedMetadataStep() {
  const { state, updateSharedMetadata, setReportType } = useWizard();
  useEffect(() => {
    if (state.sharedMetadata.reportDate) return;
    const today = new Date().toISOString().split("T")[0];
    updateSharedMetadata({ reportDate: today });
  }, [state.sharedMetadata.reportDate, updateSharedMetadata]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Forsideinformasjon</CardTitle>
        <CardDescription>
          Opplysninger som vises på forsiden av rapporten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Forside</h3>
            <p className="text-xs text-muted-foreground">Vises på forsiden av PDF.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Rapporttype</Label>
              <Select
                value={state.reportType}
                onValueChange={(val: ReportType) => setReportType(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noise">Støy</SelectItem>
                  <SelectItem value="indoor-climate">Inneklima</SelectItem>
                  <SelectItem value="chemical">Kjemikalier / Støv</SelectItem>
                  <SelectItem value="light">Lys</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment">Oppdrag (auto)</Label>
              <Input
                id="assignment"
                value={state.sharedMetadata.assignment}
                readOnly
                className="bg-slate-50"
                placeholder="Genereres automatisk basert på rapporttype og bedrift"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="execution-date">Dato for utførelse</Label>
              <Input
                id="execution-date"
                type="date"
                value={state.sharedMetadata.date}
                onChange={(e) => updateSharedMetadata({ date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Deltakere</Label>
              <Input
                id="participants"
                value={state.sharedMetadata.participants}
                onChange={(e) => updateSharedMetadata({ participants: e.target.value })}
                placeholder="F.eks. Marie Håland"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-author">Rapport skrevet av</Label>
              <Input
                id="report-author"
                value={state.sharedMetadata.author}
                onChange={(e) => updateSharedMetadata({ author: e.target.value })}
                placeholder="F.eks. Marie Håland"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-date">Dato for rapport (auto)</Label>
              <Input
                id="report-date"
                type="date"
                value={state.sharedMetadata.reportDate}
                readOnly
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Antall vedlegg (auto)</Label>
              <Input
                id="attachments"
                value={String(state.files.length)}
                readOnly
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-sent-to">Rapport sendt til</Label>
              <Input
                id="report-sent-to"
                value={state.sharedMetadata.reportSentTo}
                onChange={(e) => updateSharedMetadata({ reportSentTo: e.target.value })}
                placeholder="F.eks. Irene Furulund"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-person">Kontaktperson i virksomheten</Label>
              <Input
                id="contact-person"
                value={state.sharedMetadata.contactPerson}
                onChange={(e) => updateSharedMetadata({ contactPerson: e.target.value })}
                placeholder="F.eks. Irene Furulund"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="advisor">KAM/HMS-rådgiver i Dr. Dropin Bedrift</Label>
              <Input
                id="advisor"
                value={state.sharedMetadata.advisor}
                onChange={(e) => updateSharedMetadata({ advisor: e.target.value })}
                placeholder="F.eks. Ida Lund"
              />
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

// Backward-compatible alias
export { SharedMetadataStep as ReportMetadataStep };
