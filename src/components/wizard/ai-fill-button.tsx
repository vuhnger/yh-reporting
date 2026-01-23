"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { ReportState } from "./wizard-context";

type AllowedField =
  | "summaryText"
  | "introExtraText"
  | "thresholdsExtraText"
  | "riskExtraText"
  | "trainingExtraText"
  | "methodText"
  | "findingsText"
  | "conclusionsExtraText"
  | "recommendationsExtraText"
  | "referencesExtraText"
  | "appendicesExtraText";

type Props = {
  field: AllowedField;
  state: ReportState;
  onApply: (text: string) => void;
  className?: string;
};

function buildContext(state: ReportState) {
  const measurements = state.measurements.map((m) => ({
    location: m.location,
    duration: m.duration,
    lex8h: m.lex8h,
    maxPeak: m.maxPeak,
    comment: m.comment,
  }));

  const numericLex = measurements
    .map((m) => Number(m.lex8h))
    .filter((v) => Number.isFinite(v));
  const numericPeak = measurements
    .map((m) => Number(m.maxPeak))
    .filter((v) => Number.isFinite(v));

  return {
    reportType: state.reportType,
    clientName: state.client.name,
    assignment: state.metadata.assignment,
    executionDate: state.metadata.date,
    reportDate: state.metadata.reportDate,
    participants: state.metadata.participants,
    measurementCount: measurements.length,
    measurementSummary: {
      lexMin: numericLex.length ? Math.min(...numericLex) : null,
      lexMax: numericLex.length ? Math.max(...numericLex) : null,
      peakMax: numericPeak.length ? Math.max(...numericPeak) : null,
      thresholds: state.thresholds,
    },
    instrument: {
      device: state.metadata.measurementDevice,
      serial: state.metadata.measurementSerial,
      calibrator: state.metadata.calibratorModel,
      calibratorSerial: state.metadata.calibratorSerial,
      lastCalibrationDate: state.metadata.lastCalibrationDate,
    },
    attachmentsCount: state.files.length,
    measurements,
  };
}

export function AIFillButton({ field, state, onApply, className }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, context: buildContext(state) }),
      });
      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!response.ok) {
        console.error("AI fill error", data);
        alert(data?.error || "AI-forslag feilet.");
        return;
      }
      if (data?.text) {
        const cleaned = data.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
        onApply(cleaned);
      } else {
        alert("AI-forslag returnerte tomt svar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className={`text-[#005041] hover:text-[#2E4F4E] ${className ?? ""}`}
      title="AI-forslag"
      aria-label="AI-forslag"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
