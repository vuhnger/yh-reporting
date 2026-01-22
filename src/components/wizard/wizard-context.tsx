"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of our report data
export interface ReportState {
  client: {
    orgNr: string;
    name: string;
    address: string;
    industry: string;
  };
  step: number;
  reportType: "indoor-climate" | "noise" | "chemical" | "light" | "";
  files: File[];
  weather: {
    include: boolean;
    location: string;
    date: string; // ISO string
    data: any; // Placeholder for now
  };
}

interface WizardContextType {
  state: ReportState;
  updateClient: (client: Partial<ReportState["client"]>) => void;
  setReportType: (type: ReportState["reportType"]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  reset: () => void;
}

const defaultState: ReportState = {
  client: {
    orgNr: "",
    name: "",
    address: "",
    industry: "",
  },
  step: 1,
  reportType: "",
  files: [],
  weather: {
    include: true,
    location: "",
    date: new Date().toISOString().split("T")[0],
    data: null,
  },
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReportState>(defaultState);

  const updateClient = (client: Partial<ReportState["client"]>) => {
    setState((prev) => ({
      ...prev,
      client: { ...prev.client, ...client },
    }));
  };

  const setReportType = (type: ReportState["reportType"]) => {
    setState((prev) => ({ ...prev, reportType: type }));
  };

  const addFiles = (files: File[]) => {
    setState((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const nextStep = () => setState((prev) => ({ ...prev, step: prev.step + 1 }));
  const prevStep = () => setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  const setStep = (step: number) => setState((prev) => ({ ...prev, step }));
  const reset = () => setState(defaultState);

  return (
    <WizardContext.Provider
      value={{
        state,
        updateClient,
        setReportType,
        addFiles,
        removeFile,
        nextStep,
        prevStep,
        setStep,
        reset,
      }}
    >
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
