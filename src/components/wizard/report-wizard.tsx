"use client";

import { ClientStep } from "./client-step";
import { ReportMetadataStep } from "./report-metadata-step";
import { MeasurementStep } from "./measurement-step";
import { ReviewStep } from "./review-step";
import { ExportStep } from "./export-step";
import { Separator } from "@/components/ui/separator";

export function ReportWizardContent() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-24">
      <section id="client-section" className="scroll-mt-24">
        <ClientStep />
      </section>

      <Separator className="my-8" />

      <section id="metadata-section" className="scroll-mt-24">
        <ReportMetadataStep />
      </section>

      <Separator className="my-8" />

      <section id="measurements-section" className="scroll-mt-24">
        <MeasurementStep />
      </section>

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
