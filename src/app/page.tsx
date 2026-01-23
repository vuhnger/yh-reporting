"use client";

import { WizardProvider } from "@/components/wizard/wizard-context";
import { ReportWizardContent } from "@/components/wizard/report-wizard";
import { PDFPreview } from "@/components/wizard/pdf-preview";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">New Occupational Health Report</h1>
        <p className="text-muted-foreground">
          Follow the steps below to automatically generate a report from measurement data.
        </p>
      </div>
      
      <WizardProvider>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-8 items-start">
          <ReportWizardContent />
          <div className="hidden lg:block sticky top-6 h-[calc(100vh-3rem)]">
            <PDFPreview />
          </div>
        </div>
      </WizardProvider>
    </div>
  );
}
