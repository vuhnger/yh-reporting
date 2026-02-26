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
    let cancelled = false;

    if (!template) {
      const resetHandle = window.setTimeout(() => {
        if (cancelled) return;
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
          prevUrlRef.current = null;
        }
        setUrl(null);
        setIsLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(resetHandle);
      };
    }

    const loadingHandle = window.setTimeout(() => {
      setIsLoading(true);
    }, 0);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const blob = await template.generatePDFBlob(state);
          const nextUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          if (prevUrlRef.current) {
            URL.revokeObjectURL(prevUrlRef.current);
          }
          prevUrlRef.current = nextUrl;
          setUrl(nextUrl);
        } catch (error) {
          if (!cancelled) {
            console.error("PDF preview generation failed:", error);
            setUrl(null);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
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
            title="PDF-forhåndsvisning"
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
