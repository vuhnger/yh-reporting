import type { ReportTemplate } from "../../template-types";

function PlaceholderStep() {
  return null;
}

function PlaceholderReview() {
  return null;
}

export const lightTemplate: ReportTemplate<Record<string, never>> = {
  type: "light",
  displayName: "Belysning",
  assignmentPrefix: "Belysningskartlegging",
  defaultData: {},

  steps: [
    { id: "light-placeholder", label: "Belysning (under utvikling)", Component: PlaceholderStep },
  ],

  ReviewComponent: PlaceholderReview,

  generatePDF: () => {
    throw new Error("Light PDF generation not yet implemented");
  },
  generatePDFBlob: () => {
    throw new Error("Light PDF generation not yet implemented");
  },
  isReadyForExport: () => false,
  exportValidationMessage: "Belysningsrapporter er under utvikling.",

  ai: {
    systemInstruction: "",
    fields: {},
    buildContext: () => ({}),
  },
};
