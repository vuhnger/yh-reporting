"use client";

import "@/lib/reports/register-templates";
import type { ReportState } from "@/lib/reports/template-types";
import { DraftActions } from "@/components/home/draft-actions";
import { WizardProvider } from "@/components/wizard/wizard-context";
import { ReportWizardContent } from "@/components/wizard/report-wizard";
import { PDFPreview } from "@/components/wizard/pdf-preview";

export function HomePageContent({ initialState, draftId }: { initialState?: ReportState; draftId?: string }) {
  return (
      <WizardProvider initialState={initialState}>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Ny yrkeshygienisk rapport</h1>
          <p className="text-muted-foreground">
            Følg stegene under for å generere rapport automatisk fra måledata.
          </p>
        </div>

        <DraftActions initialDraftId={draftId} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-8 items-start">
          <ReportWizardContent />
          <div className="hidden lg:block sticky top-6 h-[calc(100vh-3rem)]">
            <PDFPreview />
          </div>
        </div>
      </div>
    </WizardProvider>
  );
}
