import type { ReportTemplate } from "../../template-types";

function PlaceholderStep() {
  return null;
}

function PlaceholderReview() {
  return null;
}

export const indoorClimateTemplate: ReportTemplate<Record<string, never>> = {
  type: "indoor-climate",
  displayName: "Inneklima",
  assignmentPrefix: "Inneklimakartlegging",
  defaultData: {},

  steps: [
    { id: "indoor-climate-placeholder", label: "Inneklima (under utvikling)", Component: PlaceholderStep },
  ],

  ReviewComponent: PlaceholderReview,

  generatePDF: () => {
    throw new Error("Indoor climate PDF generation not yet implemented");
  },
  generatePDFBlob: () => {
    throw new Error("Indoor climate PDF generation not yet implemented");
  },
  isReadyForExport: () => false,
  exportValidationMessage: "Inneklima-rapporter er under utvikling.",

  ai: {
    systemInstruction: "",
    fields: {},
    buildContext: () => ({}),
  },
};
