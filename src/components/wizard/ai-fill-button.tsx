"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { ReportState, ReportType } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";

type Props = {
  reportType: string;
  field: string;
  state: ReportState;
  getValue: () => string;
  setValue: (text: string) => void;
  className?: string;
};

export function AIFillButton({ reportType, field, state, getValue, setValue, className }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const template = getTemplate(reportType as ReportType);
      const context = template?.ai.buildContext(state) ?? {};

      const response = await fetch("/api/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, field, context }),
      });
      if (!response.ok) {
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;
        console.error("AI fill error", data);
        alert(data?.error || "AI-forslag feilet.");
        return;
      }

      if (!response.body) {
        alert("AI-forslag feilet (mangler respons).");
        return;
      }

      const base = getValue().trim();
      const basePrefix = base ? `${base}\n\n` : "";
      setValue(basePrefix);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let flushHandle: number | null = null;

      const flush = () => {
        const cleaned = buffer
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
        setValue(`${basePrefix}${cleaned}`);
        flushHandle = null;
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: !doneReading });
        if (chunkValue) {
          buffer += chunkValue;
          if (flushHandle === null) {
            flushHandle = window.setTimeout(flush, 200);
          }
        }
      }

      if (flushHandle !== null) {
        window.clearTimeout(flushHandle);
      }
      flush();
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
