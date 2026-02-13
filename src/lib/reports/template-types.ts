import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Report type discriminator
// ---------------------------------------------------------------------------

export type ReportType = "noise" | "indoor-climate" | "chemical" | "light";

// ---------------------------------------------------------------------------
// Shared metadata – common to every report type
// ---------------------------------------------------------------------------

export interface SharedMetadata {
  assignment: string;
  date: string;
  participants: string;
  contactPerson: string;
  author: string;
  reportDate: string;
  reportSentTo: string;
  advisor: string;
}

// ---------------------------------------------------------------------------
// AI field configuration
// ---------------------------------------------------------------------------

export interface AIFieldConfig {
  label: string;
  purpose: string;
  guidance: string;
  length?: string;
  structure?: string;
  outputStyle?: "paragraph" | "line-list";
}

// ---------------------------------------------------------------------------
// Discriminated union for template-specific data
// ---------------------------------------------------------------------------

export type TemplateData =
  | { type: "noise"; noise: unknown }
  | { type: "indoor-climate"; indoorClimate: unknown }
  | { type: "chemical"; chemical: Record<string, never> }
  | { type: "light"; light: Record<string, never> }
  | null;

// ---------------------------------------------------------------------------
// ReportState – the root state shape used across the app
// ---------------------------------------------------------------------------

export interface ReportState {
  client: {
    orgNr: string;
    name: string;
    address: string;
    industry: string;
  };
  step: number;
  reportType: ReportType | "";
  sharedMetadata: SharedMetadata;
  files: File[];
  weather: {
    include: boolean;
    location: string;
    date: string;
    data: unknown;
  };
  data: TemplateData;
}

// ---------------------------------------------------------------------------
// ReportTemplate – what every template module must provide
// ---------------------------------------------------------------------------

export interface ReportTemplate<TData = unknown> {
  type: ReportType;
  displayName: string;
  assignmentPrefix: string;
  defaultData: TData;

  steps: Array<{
    id: string;
    label: string;
    Component: ComponentType;
  }>;

  ReviewComponent: ComponentType;

  generatePDF: (state: ReportState) => void;
  generatePDFBlob: (state: ReportState) => Blob;
  isReadyForExport: (state: ReportState) => boolean;
  exportValidationMessage?: string;

  ai: {
    systemInstruction: string;
    fields: Record<string, AIFieldConfig>;
    buildContext: (state: ReportState) => Record<string, unknown>;
  };

  sampleData?: ReportState;
}

// ---------------------------------------------------------------------------
// Helper to wrap template default data into the TemplateData union
// ---------------------------------------------------------------------------

export function createTemplateData(type: ReportType, data: unknown): TemplateData {
  switch (type) {
    case "noise":
      return { type: "noise", noise: data };
    case "indoor-climate":
      return { type: "indoor-climate", indoorClimate: data };
    case "chemical":
      return { type: "chemical", chemical: data as Record<string, never> };
    case "light":
      return { type: "light", light: data as Record<string, never> };
  }
}
