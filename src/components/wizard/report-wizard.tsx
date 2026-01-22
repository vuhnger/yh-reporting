"use client";

import { useWizard } from "./wizard-context";
import { ClientStep } from "./client-step";
import { UploadStep } from "./upload-step";
import { ReviewStep } from "./review-step";
import { ExportStep } from "./export-step";
import { Progress } from "@/components/ui/progress";

export function ReportWizardContent() {
  const { state } = useWizard();
  
  const totalSteps = 4;
  const progress = (state.step / totalSteps) * 100;

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex justify-between text-sm font-medium text-muted-foreground">
          <span>Step {state.step} of {totalSteps}</span>
          <span>
            {state.step === 1 && "Client Info"}
            {state.step === 2 && "Data Upload"}
            {state.step === 3 && "Review"}
            {state.step === 4 && "Export"}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="mt-8">
        {state.step === 1 && <ClientStep />}
        {state.step === 2 && <UploadStep />}
        {state.step === 3 && <ReviewStep />}
        {state.step === 4 && <ExportStep />}
      </div>
    </div>
  );
}
