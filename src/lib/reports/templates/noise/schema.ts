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

export interface SelectedInstrument {
  id: string;
  hva: string;
  modell: string;
  serienr: string;
  sistKalibrert: string | null;
  kilde: "sheets" | "manuell";
}

export interface NoiseMetadata {
  summaryText: string;
  introExtraText: string;
  thresholdsExtraText: string;
  noiseGroup: "I" | "II" | "III";
  riskExtraText: string;
  trainingExtraText: string;
  selectedInstruments: SelectedInstrument[];
  methodText: string;
  findingsText: string;
  conclusionsExtraText: string;
  recommendationsExtraText: string;
  referencesText: string;
  referencesExtraText: string;
  appendicesExtraText: string;
  textImages: Record<string, string>;
}

export interface NoiseReportData {
  metadata: NoiseMetadata;
  measurements: Measurement[];
  thresholds: Thresholds;
}

export interface MeasurementGroup {
  location: string;
  measurements: Measurement[];
}

export const defaultNoiseMetadata: NoiseMetadata = {
  summaryText: "",
  introExtraText: "",
  thresholdsExtraText: "",
  noiseGroup: "II",
  riskExtraText: "",
  trainingExtraText: "",
  selectedInstruments: [],
  methodText: "",
  findingsText: "",
  conclusionsExtraText: "",
  recommendationsExtraText: "",
  referencesText: "",
  referencesExtraText: "",
  appendicesExtraText: "",
  textImages: {},
};

export const defaultThresholds: Thresholds = {
  lex8h: { red: 85, orange: 80, yellow: 60 }, // Default gruppe II: 10 dB under maks (70)
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

export function getMeasurementLabel(index: number) {
  return `Måling ${index + 1}`;
}

export function groupMeasurementsByLocation(measurements: Measurement[]): MeasurementGroup[] {
  const groups = new Map<string, MeasurementGroup>();

  measurements.forEach((measurement) => {
    const trimmedLocation = measurement.location.trim();
    const key = trimmedLocation || "__empty__";
    const existing = groups.get(key);

    if (existing) {
      existing.measurements.push(measurement);
      return;
    }

    groups.set(key, {
      location: trimmedLocation || "Ikke angitt",
      measurements: [measurement],
    });
  });

  return Array.from(groups.values());
}
