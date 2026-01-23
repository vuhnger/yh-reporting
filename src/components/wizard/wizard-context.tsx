"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

// Measurement Data Structure
export interface Measurement {
  id: string;
  location: string;
  duration: string;
  lex8h: number | "";
  maxPeak: number | "";
  comment: string;
}

// Threshold Configuration
export interface Thresholds {
  lex8h: {
    red: number;    // > 85
    orange: number; // > 80
    yellow: number; // > 70
  };
  peak: {
    red: number;    // > 130
    yellow: number; // > 120
  };
}

// Report Metadata
export interface ReportMetadata {
  assignment: string;     // "Oppdrag"
  date: string;          // "Dato for utførelse"
  participants: string;   // "Deltakere"
  contactPerson: string;  // "Kontaktperson"
  author: string;         // "Rapport skrevet av"
  reportDate: string;     // "Dato for rapport"
  reportSentTo: string;   // "Rapport sendt til"
  advisor: string;        // "KAM/HMS-rådgiver"
  summaryText: string;    // "Sammendrag (valgfri)"
  measurementDevice: string;     // Måleinstrument
  measurementSerial: string;     // Serienr. instrument
  calibratorModel: string;       // Kalibrator
  calibratorSerial: string;      // Serienr. kalibrator
  lastCalibrationDate: string;   // Siste kalibrering
  methodText: string;            // Tilleggstekst metode
}

// Define the shape of our report data
export interface ReportState {
  client: {
    orgNr: string;
    name: string;
    address: string;
    industry: string;
  };
  step: number;
  reportType: "noise" | "indoor-climate" | "chemical" | "light" | "";
  
  // Specific Data for Noise Reports
  metadata: ReportMetadata;
  measurements: Measurement[];
  thresholds: Thresholds;
  
  files: File[];
  weather: {
    include: boolean;
    location: string;
    date: string;
    data: any;
  };
}

interface WizardContextType {
  state: ReportState;
  updateClient: (client: Partial<ReportState["client"]>) => void;
  updateMetadata: (meta: Partial<ReportMetadata>) => void;
  setReportType: (type: ReportState["reportType"]) => void;
  
  // Measurement Actions
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
  
  metadata: {
    assignment: "",
    date: new Date().toISOString().split("T")[0],
    participants: "",
    contactPerson: "",
    author: "Consultant Name", // TODO: Fetch from logged in user
    reportDate: new Date().toISOString().split("T")[0],
    reportSentTo: "",
    advisor: "",
    summaryText: "",
    measurementDevice: "",
    measurementSerial: "",
    calibratorModel: "",
    calibratorSerial: "",
    lastCalibrationDate: "",
    methodText: "",
  },
  
  measurements: [],
  
  thresholds: {
    lex8h: { red: 85, orange: 80, yellow: 70 },
    peak: { red: 130, yellow: 120 },
  },

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

  const updateClient = useCallback((client: Partial<ReportState["client"]>) => {
    setState((prev) => ({
      ...prev,
      client: { ...prev.client, ...client },
    }));
  }, []);

  const updateMetadata = useCallback((meta: Partial<ReportMetadata>) => {
    setState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...meta },
    }));
  }, []);

  const setReportType = useCallback((type: ReportState["reportType"]) => {
    setState((prev) => {
      // Auto-generate assignment title if both client name and type exist
      let assignment = prev.metadata.assignment;
      if (!assignment && prev.client.name) {
         const typeLabel = type === "noise" ? "Støykartlegging" : "Kartlegging";
         assignment = `${typeLabel} hos ${prev.client.name}`;
      }
      
      return { 
        ...prev, 
        reportType: type,
        metadata: { ...prev.metadata, assignment }
      };
    });
  }, []);

  const addMeasurement = useCallback(() => {
    setState((prev) => ({
      ...prev,
      measurements: [
        ...prev.measurements,
        { 
          id: Math.random().toString(36).substr(2, 9), 
          location: "", 
          duration: "", 
          lex8h: "", 
          maxPeak: "", 
          comment: "" 
        }
      ]
    }));
  }, []);

  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setState((prev) => ({
      ...prev,
      measurements: prev.measurements.map((m) => 
        m.id === id ? { ...m, ...data } : m
      )
    }));
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      measurements: prev.measurements.filter((m) => m.id !== id)
    }));
  }, []);

  const updateThresholds = useCallback((thresholds: Partial<Thresholds>) => {
    setState((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, ...thresholds }
    }));
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
    updateMetadata,
    setReportType,
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
  }), [state, updateClient, updateMetadata, setReportType, addMeasurement, updateMeasurement, removeMeasurement, updateThresholds, addFiles, removeFile, nextStep, prevStep, setStep, reset, loadReport]);

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
