"use client";

import { useState } from "react";
import { ClientStep } from "./client-step";
import { SharedMetadataStep } from "./report-metadata-step";
import { ReviewStep } from "./review-step";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWizard } from "./wizard-context";
import type { ReportType } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";
import { FileDown } from "lucide-react";

export function ReportWizardContent() {
  const { state } = useWizard();
  const [showReview, setShowReview] = useState(false);

  const template = state.reportType
    ? getTemplate(state.reportType as ReportType)
    : undefined;
  const isReadyForExport = template ? template.isReadyForExport(state) : false;

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-36">
      <section id="client-section" className="scroll-mt-24">
        <ClientStep />
      </section>

      <Separator className="my-8" />

      <section id="metadata-section" className="scroll-mt-24">
        <SharedMetadataStep />
      </section>

      {template?.steps.map((step) => (
        <div key={step.id}>
          <Separator className="my-8" />
          <section id={`${step.id}-section`} className="scroll-mt-24">
            <step.Component />
          </section>
        </div>
      ))}

      <Separator className="my-8" />

      <section id="review-section" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
          <div>
            <p className="font-medium text-primary">Gjennomgang (valgfritt)</p>
            <p className="text-sm text-muted-foreground">
              Åpne gjennomgang hvis du vil kontrollere alt før eksport.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReview((prev) => !prev)}
          >
            {showReview ? "Skjul gjennomgang" : "Vis gjennomgang"}
          </Button>
        </div>
        {showReview && <ReviewStep />}
      </section>

      <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:w-auto">
        <div className="space-y-2 sm:space-y-1">
          {!isReadyForExport && (
            <p className="rounded-md border border-destructive/30 bg-white px-3 py-2 text-xs text-destructive shadow sm:max-w-sm">
              {template?.exportValidationMessage ||
                "Du må fylle ut bedriftsinformasjon og velge rapporttype før du kan laste ned."}
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full gap-2 shadow-lg sm:w-auto"
            disabled={!template || !isReadyForExport}
            onClick={async () => {
              if (!template) return;
              try {
                await template.generatePDF(state);
              } catch (error) {
                console.error("PDF generation failed:", error);
              }
            }}
          >
            <FileDown className="h-4 w-4" />
            Last ned PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
