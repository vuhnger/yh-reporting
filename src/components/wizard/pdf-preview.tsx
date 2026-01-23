"use client";

import { useEffect, useRef, useState } from "react";
import { useWizard } from "./wizard-context";
import { generateNoiseReportPDFBlob } from "@/lib/reports/pdf-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PREVIEW_DEBOUNCE_MS = 800;

export function PDFPreview() {
  const { state } = useWizard();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.reportType !== "noise") {
      setUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handle = window.setTimeout(() => {
      const blob = generateNoiseReportPDFBlob(state);
      const nextUrl = URL.createObjectURL(blob);
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = nextUrl;
      setUrl(nextUrl);
      setIsLoading(false);
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [state]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  if (state.reportType !== "noise") {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">PDF‑forhåndsvisning</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Forhåndsvisning støtter foreløpig kun støyrapport.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">PDF‑forhåndsvisning</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Oppdaterer forhåndsvisning…</div>
        )}
        {url ? (
          <iframe
            title="PDF Preview"
            src={url}
            className="w-full h-[calc(100vh-12rem)] border-0"
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground">Ingen forhåndsvisning tilgjengelig.</div>
        )}
      </CardContent>
    </Card>
  );
}
