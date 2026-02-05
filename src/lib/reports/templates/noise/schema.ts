import type { ReportState } from "../../template-types";

// ---------------------------------------------------------------------------
// Noise-specific types and defaults
// ---------------------------------------------------------------------------

export interface Measurement {
  id: string;
  location: string;
  duration: string;
  lex8h: number | "";
  maxPeak: number | "";
  comment: string;
}

export interface Thresholds {
  lex8h: {
    red: number;
    orange: number;
    yellow: number;
  };
  peak: {
    red: number;
    yellow: number;
  };
}

export interface NoiseMetadata {
  summaryText: string;
  introExtraText: string;
  thresholdsExtraText: string;
  noiseGroup: "I" | "II" | "III";
  riskExtraText: string;
  trainingExtraText: string;
  measurementDevice: string;
  measurementSerial: string;
  calibratorModel: string;
  calibratorSerial: string;
  lastCalibrationDate: string;
  methodText: string;
  findingsText: string;
  conclusionsExtraText: string;
  recommendationsExtraText: string;
  referencesText: string;
  referencesExtraText: string;
  appendicesExtraText: string;
}

export interface NoiseReportData {
  metadata: NoiseMetadata;
  measurements: Measurement[];
  thresholds: Thresholds;
}

export const defaultNoiseMetadata: NoiseMetadata = {
  summaryText: "",
  introExtraText: "",
  thresholdsExtraText: "",
  noiseGroup: "II",
  riskExtraText: "",
  trainingExtraText: "",
  measurementDevice: "",
  measurementSerial: "",
  calibratorModel: "",
  calibratorSerial: "",
  lastCalibrationDate: "",
  methodText: "",
  findingsText: "",
  conclusionsExtraText: "",
  recommendationsExtraText: "",
  referencesText: "",
  referencesExtraText: "",
  appendicesExtraText: "",
};

export const defaultThresholds: Thresholds = {
  lex8h: { red: 85, orange: 80, yellow: 70 },
  peak: { red: 130, yellow: 120 },
};

export const defaultNoiseData: NoiseReportData = {
  metadata: { ...defaultNoiseMetadata },
  measurements: [],
  thresholds: { ...defaultThresholds },
};

// ---------------------------------------------------------------------------
// Helper to extract typed noise data from ReportState
// ---------------------------------------------------------------------------

export function getNoiseData(state: ReportState): NoiseReportData | null {
  if (state.data?.type === "noise") {
    return state.data.noise as NoiseReportData;
  }
  return null;
}
