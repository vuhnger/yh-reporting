"use client";

import { WizardProvider } from "@/components/wizard/wizard-context";
import { ReportWizardContent } from "@/components/wizard/report-wizard";

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
        <ReportWizardContent />
      </WizardProvider>
    </div>
  );
}