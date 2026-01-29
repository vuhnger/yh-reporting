import type { ReportTemplate } from "../../template-types";
import type { NoiseReportData } from "./schema";
import { defaultNoiseData, getNoiseData } from "./schema";
import { generateNoiseReportPDF, generateNoiseReportPDFBlob } from "./pdf";
import { noiseSystemInstruction, noiseAIFields, buildNoiseAIContext } from "./ai";
import { noiseSampleReport } from "./sample";
import { NoiseMetadataStep } from "./steps/noise-metadata-step";
import { NoiseMeasurementStep } from "./steps/noise-measurement-step";
import { NoiseReviewSection } from "./steps/noise-review-section";

export const noiseTemplate: ReportTemplate<NoiseReportData> = {
  type: "noise",
  displayName: "Støy",
  assignmentPrefix: "Støykartlegging",
  defaultData: defaultNoiseData,

  steps: [
    { id: "noise-metadata", label: "Støyrapport – detaljer", Component: NoiseMetadataStep },
    { id: "noise-measurements", label: "Støymålinger", Component: NoiseMeasurementStep },
  ],

  ReviewComponent: NoiseReviewSection,

  generatePDF: generateNoiseReportPDF,
  generatePDFBlob: generateNoiseReportPDFBlob,

  isReadyForExport: (state) => {
    const noise = getNoiseData(state);
    return !!(state.client.orgNr && noise && noise.measurements.length > 0);
  },

  exportValidationMessage:
    "Du må fylle ut bedriftsinformasjon og legge til minst én måling før du kan laste ned.",

  ai: {
    systemInstruction: noiseSystemInstruction,
    fields: noiseAIFields,
    buildContext: buildNoiseAIContext,
  },

  sampleData: noiseSampleReport,
};
