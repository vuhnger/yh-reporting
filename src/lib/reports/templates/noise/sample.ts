import type { ReportState } from "../../template-types";
import type { NoiseReportData } from "./schema";

const noiseSampleData: NoiseReportData = {
  metadata: {
    summaryText: "",
    introExtraText: "",
    thresholdsExtraText: "",
    noiseGroup: "II",
    riskExtraText: "",
    trainingExtraText: "",
    measurementDevice: "Cirrus Optimus Red CR: 161C",
    measurementSerial: "G304333",
    calibratorModel: "Cirrus Acoustic Calibrator CR: 515",
    calibratorSerial: "101825",
    lastCalibrationDate: "2025-07-07",
    methodText:
      "Det ble gjennomført forenklede målinger av støy på arbeidsplasser på laboratoriet. " +
      "Yrkeshygieniker tok målingene da maskinene ga mest lyd, basert på kartlegging sammen med ansatte på lab.",
    findingsText: "",
    conclusionsExtraText: "",
    recommendationsExtraText: "",
    referencesText: "",
    referencesExtraText: "",
    appendicesExtraText: "",
    textImages: {},
  },
  measurements: [
    {
      id: "sample-1",
      location: "GC-MS rom",
      duration: "1 min",
      lex8h: 67,
      maxPeak: 93,
      comment: "",
    },
    {
      id: "sample-2",
      location: "EZ-stream, vannlab",
      duration: "1 min",
      lex8h: 65,
      maxPeak: 97,
      comment: "",
    },
    {
      id: "sample-3",
      location: "San++, vannlab",
      duration: "1 min",
      lex8h: 64,
      maxPeak: 88,
      comment: "",
    },
    {
      id: "sample-4",
      location: "VOC rom",
      duration: "1 min",
      lex8h: 67,
      maxPeak: 90,
      comment: "",
    },
    {
      id: "sample-5",
      location: "ICP-MS",
      duration: "1 min",
      lex8h: 60,
      maxPeak: 88,
      comment: "",
    },
    {
      id: "sample-6",
      location: "ICP-MS, bakrom ved avtrekkskap, dør åpen",
      duration: "1 min",
      lex8h: 56,
      maxPeak: 88,
      comment: "",
    },
    {
      id: "sample-7",
      location: "ICP-MS, bakrom ved avtrekkskap, dør lukket",
      duration: "1 min",
      lex8h: 52,
      maxPeak: 89,
      comment: "",
    },
  ],
  thresholds: {
    lex8h: { red: 85, orange: 80, yellow: 60 }, // Gruppe II: 10 dB under maks (70)
    peak: { red: 130, yellow: 120 },
  },
};

export const noiseSampleReport: ReportState = {
  client: {
    orgNr: "991 974 482",
    name: "ALS Laboratory Group Norway AS",
    address: "",
    industry: "",
  },
  step: 1,
  reportType: "noise",
  sharedMetadata: {
    assignment: "Kartlegging av støy på lab.",
    date: "2025-09-23",
    participants: "Marie Håland",
    contactPerson: "Irene Furulund",
    author: "Marie Håland",
    reportDate: "2025-09-23",
    reportSentTo: "Irene Furulund",
    advisor: "Ida Lund",
  },
  files: [],
  weather: {
    include: true,
    location: "",
    date: "2025-09-23",
    data: null,
  },
  data: {
    type: "noise",
    noise: noiseSampleData,
  },
};
