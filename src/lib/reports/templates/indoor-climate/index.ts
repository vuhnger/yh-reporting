import type { ReportTemplate } from "../../template-types";
import type { IndoorClimateReportData } from "./schema";
import { defaultIndoorClimateData, getIndoorClimateData } from "./schema";
import { generateIndoorClimateReportPDF, generateIndoorClimateReportPDFBlob } from "./pdf";
import {
  indoorClimateSystemInstruction,
  indoorClimateAIFields,
  buildIndoorClimateAIContext,
} from "./ai";
import { indoorClimateSampleReport } from "./sample";
import { IndoorClimateMetadataStep } from "./steps/indoor-climate-metadata-step";
import { IndoorClimateSensorStep } from "./steps/indoor-climate-sensor-step";
import { IndoorClimateReviewSection } from "./steps/indoor-climate-review-section";

export const indoorClimateTemplate: ReportTemplate<IndoorClimateReportData> = {
  type: "indoor-climate",
  displayName: "Inneklima",
  assignmentPrefix: "Inneklimakartlegging",
  defaultData: defaultIndoorClimateData,

  steps: [
    { id: "indoor-climate-metadata", label: "Inneklima - detaljer", Component: IndoorClimateMetadataStep },
    { id: "indoor-climate-sensors", label: "Inneklimamalere", Component: IndoorClimateSensorStep },
  ],

  ReviewComponent: IndoorClimateReviewSection,

  generatePDF: generateIndoorClimateReportPDF,
  generatePDFBlob: generateIndoorClimateReportPDFBlob,

  isReadyForExport: (state) => {
    const indoor = getIndoorClimateData(state);
    return !!(
      state.client.orgNr &&
      indoor &&
      indoor.metadata.sensors.length > 0
    );
  },
  exportValidationMessage:
    "Du ma fylle ut bedriftsinformasjon og minst en inneklimamaler for a kunne laste ned.",

  ai: {
    systemInstruction: indoorClimateSystemInstruction,
    fields: indoorClimateAIFields,
    buildContext: buildIndoorClimateAIContext,
  },

  sampleData: indoorClimateSampleReport,
};
