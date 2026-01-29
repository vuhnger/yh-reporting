"use client";

import { ClientStep } from "./client-step";
import { SharedMetadataStep } from "./report-metadata-step";
import { ReviewStep } from "./review-step";
import { ExportStep } from "./export-step";
import { Separator } from "@/components/ui/separator";
import { useWizard } from "./wizard-context";
import type { ReportType } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";

export function ReportWizardContent() {
  const { state } = useWizard();

  const template = state.reportType
    ? getTemplate(state.reportType as ReportType)
    : undefined;

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-24">
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

      <section id="review-section" className="scroll-mt-24">
        <ReviewStep />
      </section>

      <Separator className="my-8" />

      <section id="export-section" className="scroll-mt-24">
        <ExportStep />
      </section>
    </div>
  );
}
