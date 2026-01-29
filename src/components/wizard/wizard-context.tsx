"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import type { ReportState, ReportType, SharedMetadata, TemplateData } from "@/lib/reports/template-types";
import { createTemplateData } from "@/lib/reports/template-types";
import { getTemplate } from "@/lib/reports/template-registry";
import type { NoiseMetadata, Measurement, Thresholds } from "@/lib/reports/templates/noise/schema";
import { getNoiseData } from "@/lib/reports/templates/noise/schema";

// Re-export types so existing consumers keep working
export type { ReportState, SharedMetadata } from "@/lib/reports/template-types";
export type { Measurement, Thresholds, NoiseMetadata } from "@/lib/reports/templates/noise/schema";

interface WizardContextType {
  state: ReportState;
  updateClient: (client: Partial<ReportState["client"]>) => void;
  updateSharedMetadata: (meta: Partial<SharedMetadata>) => void;
  setReportType: (type: ReportState["reportType"]) => void;
  updateTemplateData: (updater: (data: TemplateData) => TemplateData) => void;

  // Noise convenience wrappers
  updateNoiseMetadata: (meta: Partial<NoiseMetadata>) => void;
  addMeasurement: () => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  removeMeasurement: (id: string) => void;
  updateThresholds: (thresholds: Partial<Thresholds>) => void;

  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  reset: () => void;
  loadReport: (report: ReportState) => void;
}

const defaultState: ReportState = {
  client: { orgNr: "", name: "", address: "", industry: "" },
  step: 1,
  reportType: "",
  sharedMetadata: {
    assignment: "",
    date: new Date().toISOString().split("T")[0],
    participants: "",
    contactPerson: "",
    author: "Consultant Name", // TODO: Fetch from logged in user
    reportDate: new Date().toISOString().split("T")[0],
    reportSentTo: "",
    advisor: "",
  },
  files: [],
  weather: {
    include: true,
    location: "",
    date: new Date().toISOString().split("T")[0],
    data: null,
  },
  data: null,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReportState>(defaultState);

  const updateClient = useCallback((client: Partial<ReportState["client"]>) => {
    setState((prev) => {
      const template = prev.reportType ? getTemplate(prev.reportType as ReportType) : undefined;
      const prefix = template?.assignmentPrefix || "Kartlegging";
      return {
        ...prev,
        client: { ...prev.client, ...client },
        sharedMetadata: {
          ...prev.sharedMetadata,
          assignment: prev.sharedMetadata.assignment
            ? prev.sharedMetadata.assignment
            : client.name || prev.client.name
              ? `${prefix} hos ${client.name ?? prev.client.name}`
              : prev.sharedMetadata.assignment,
        },
      };
    });
  }, []);

  const updateSharedMetadata = useCallback((meta: Partial<SharedMetadata>) => {
    setState((prev) => ({
      ...prev,
      sharedMetadata: { ...prev.sharedMetadata, ...meta },
    }));
  }, []);

  const setReportType = useCallback((type: ReportState["reportType"]) => {
    setState((prev) => {
      let assignment = prev.sharedMetadata.assignment;
      if (!assignment && prev.client.name && type) {
        const template = getTemplate(type as ReportType);
        const prefix = template?.assignmentPrefix || "Kartlegging";
        assignment = `${prefix} hos ${prev.client.name}`;
      }

      let data: TemplateData = null;
      if (type) {
        const template = getTemplate(type as ReportType);
        if (template) {
          data = createTemplateData(type as ReportType, template.defaultData);
        }
      }

      return {
        ...prev,
        reportType: type,
        sharedMetadata: { ...prev.sharedMetadata, assignment },
        data,
      };
    });
  }, []);

  const updateTemplateData = useCallback((updater: (data: TemplateData) => TemplateData) => {
    setState((prev) => ({
      ...prev,
      data: updater(prev.data),
    }));
  }, []);

  // --- Noise convenience wrappers ---

  const updateNoiseMetadata = useCallback((meta: Partial<NoiseMetadata>) => {
    setState((prev) => {
      const noise = getNoiseData(prev);
      if (!noise) return prev;
      return {
        ...prev,
        data: {
          type: "noise" as const,
          noise: { ...noise, metadata: { ...noise.metadata, ...meta } },
        },
      };
    });
  }, []);

  const addMeasurement = useCallback(() => {
    setState((prev) => {
      const noise = getNoiseData(prev);
      if (!noise) return prev;
      return {
        ...prev,
        data: {
          type: "noise" as const,
          noise: {
            ...noise,
            measurements: [
              ...noise.measurements,
              {
                id: Math.random().toString(36).substr(2, 9),
                location: "",
                duration: "",
                lex8h: "",
                maxPeak: "",
                comment: "",
              },
            ],
          },
        },
      };
    });
  }, []);

  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setState((prev) => {
      const noise = getNoiseData(prev);
      if (!noise) return prev;
      return {
        ...prev,
        data: {
          type: "noise" as const,
          noise: {
            ...noise,
            measurements: noise.measurements.map((m) =>
              m.id === id ? { ...m, ...data } : m
            ),
          },
        },
      };
    });
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setState((prev) => {
      const noise = getNoiseData(prev);
      if (!noise) return prev;
      return {
        ...prev,
        data: {
          type: "noise" as const,
          noise: {
            ...noise,
            measurements: noise.measurements.filter((m) => m.id !== id),
          },
        },
      };
    });
  }, []);

  const updateThresholds = useCallback((thresholds: Partial<Thresholds>) => {
    setState((prev) => {
      const noise = getNoiseData(prev);
      if (!noise) return prev;
      return {
        ...prev,
        data: {
          type: "noise" as const,
          noise: {
            ...noise,
            thresholds: { ...noise.thresholds, ...thresholds },
          },
        },
      };
    });
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setState((prev) => ({ ...prev, files: [...prev.files, ...files] }));
  }, []);

  const removeFile = useCallback((index: number) => {
    setState((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  }, []);

  const nextStep = useCallback(() => setState((prev) => ({ ...prev, step: prev.step + 1 })), []);
  const prevStep = useCallback(() => setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) })), []);
  const setStep = useCallback((step: number) => setState((prev) => ({ ...prev, step })), []);
  const reset = useCallback(() => setState(defaultState), []);
  const loadReport = useCallback((report: ReportState) => setState(report), []);

  const value = useMemo(() => ({
    state,
    updateClient,
    updateSharedMetadata,
    setReportType,
    updateTemplateData,
    updateNoiseMetadata,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    updateThresholds,
    addFiles,
    removeFile,
    nextStep,
    prevStep,
    setStep,
    reset,
    loadReport,
  }), [state, updateClient, updateSharedMetadata, setReportType, updateTemplateData, updateNoiseMetadata, addMeasurement, updateMeasurement, removeMeasurement, updateThresholds, addFiles, removeFile, nextStep, prevStep, setStep, reset, loadReport]);

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
