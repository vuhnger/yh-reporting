"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, Download } from "lucide-react";

export function ExportStep() {
  const { state } = useWizard();

  const handleDownload = (format: "docx" | "pdf") => {
    // TODO: Implement actual generation
    console.log(`Generating ${format} for`, state);
    alert(`Generating ${format.toUpperCase()}... (Not implemented yet)`);
  };

  const isReady = state.client.orgNr && state.measurements.length > 0;

  return (
    <Card className="w-full max-w-2xl mx-auto text-center border-primary/20 shadow-lg bg-slate-50/50">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Ferdigstill Rapport</CardTitle>
        <CardDescription>
          Generer rapporten basert på informasjonen du har lagt inn ovenfor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 text-lg border-2 hover:border-blue-500/50 hover:bg-blue-50 transition-all" 
            variant="outline"
            onClick={() => handleDownload("docx")}
            disabled={!isReady}
          >
            <FileText className="h-8 w-8 text-blue-600" />
            Last ned .docx
            <span className="text-xs text-muted-foreground font-normal">Redigerbar Word-fil</span>
          </Button>
          
          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 text-lg border-2 hover:border-red-500/50 hover:bg-red-50 transition-all" 
            variant="outline"
            onClick={() => handleDownload("pdf")}
            disabled={!isReady}
          >
            <FileDown className="h-8 w-8 text-red-600" />
            Last ned .pdf
            <span className="text-xs text-muted-foreground font-normal">Låst PDF-fil</span>
          </Button>
        </div>
        {!isReady && (
            <p className="text-sm text-destructive">
                Du må fylle ut bedriftsinformasjon og legge til minst én måling før du kan laste ned.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
