"use client";

import { useEffect, useRef, useState } from "react";
import { useWizard } from "./wizard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportType } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";

const PREVIEW_DEBOUNCE_MS = 800;

export function PDFPreview() {
  const { state } = useWizard();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  const template = state.reportType
    ? getTemplate(state.reportType as ReportType)
    : undefined;

  useEffect(() => {
    if (!template) {
      const resetHandle = window.setTimeout(() => {
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
          prevUrlRef.current = null;
        }
        setUrl(null);
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(resetHandle);
    }

    const loadingHandle = window.setTimeout(() => {
      setIsLoading(true);
    }, 0);
    const handle = window.setTimeout(() => {
      const blob = template.generatePDFBlob(state);
      const nextUrl = URL.createObjectURL(blob);
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = nextUrl;
      setUrl(nextUrl);
      setIsLoading(false);
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(loadingHandle);
      window.clearTimeout(handle);
    };
  }, [state, template]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  if (!template) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">PDF-forhåndsvisning</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Velg en rapporttype for å se forhåndsvisning.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">PDF-forhåndsvisning</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Oppdaterer forhåndsvisning...</div>
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
