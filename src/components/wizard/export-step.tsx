"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, CheckCircle2 } from "lucide-react";

export function ExportStep() {
  const { state, reset } = useWizard();

  return (
    <Card className="w-full max-w-2xl mx-auto text-center">
      <CardHeader>
        <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <CardTitle>Report Generated!</CardTitle>
        <CardDescription>Your report for <strong>{state.client.name}</strong> is ready for download.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button className="h-24 flex flex-col items-center justify-center gap-2 text-lg" variant="outline">
            <FileText className="h-8 w-8 text-blue-600" />
            Download .docx
            <span className="text-xs text-muted-foreground font-normal">Editable Word Document</span>
          </Button>
          
          <Button className="h-24 flex flex-col items-center justify-center gap-2 text-lg" variant="outline">
            <FileDown className="h-8 w-8 text-red-600" />
            Download .pdf
            <span className="text-xs text-muted-foreground font-normal">Final PDF Document</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={reset}>Start New Report</Button>
      </CardFooter>
    </Card>
  );
}
