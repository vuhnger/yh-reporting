import type { ReportTemplate } from "../../template-types";

function PlaceholderStep() {
  return null;
}

function PlaceholderReview() {
  return null;
}

export const chemicalTemplate: ReportTemplate<Record<string, never>> = {
  type: "chemical",
  displayName: "Kjemisk helsefare",
  assignmentPrefix: "Kartlegging av kjemisk helsefare",
  defaultData: {},

  steps: [
    { id: "chemical-placeholder", label: "Kjemisk helsefare (under utvikling)", Component: PlaceholderStep },
  ],

  ReviewComponent: PlaceholderReview,

  generatePDF: () => {
    throw new Error("Chemical PDF generation not yet implemented");
  },
  generatePDFBlob: () => {
    throw new Error("Chemical PDF generation not yet implemented");
  },
  isReadyForExport: () => false,
  exportValidationMessage: "Kjemisk helsefare-rapporter er under utvikling.",

  ai: {
    systemInstruction: "",
    fields: {},
    buildContext: () => ({}),
  },
};
