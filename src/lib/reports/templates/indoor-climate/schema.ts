import type { ReportState } from "../../template-types";

export interface IndoorClimateInstrument {
  id: string;
  displayName?: string;
  hva: string;
  modell: string;
  serienr: string;
  sistKalibrert: string | null;
  kilde: "sheets" | "manuell";
  malerNummer?: string;
  maleutstyrssett?: string;
  innkjopsar?: string;
  programvareNavn?: string;
  programvareVersjon?: string;
}

export interface IndoorClimateMetricStats {
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface IndoorClimateSensor {
  id: string;
  instrument: IndoorClimateInstrument | null;
  measurementPeriodStart?: string;
  measurementPeriodEnd?: string;
  locationName: string;
  placementDescription: string;
  placementImage: string | null;
  placementImageCaption: string;
  sensorReportImage: string | null;
  sensorReportImageCaption: string;
  chartImage: string | null;
  chartCaption: string;
  stats: {
    temperature: IndoorClimateMetricStats;
    humidity: IndoorClimateMetricStats;
    co2: IndoorClimateMetricStats;
  };
  interpretation: {
    temperatureText: string;
    humidityText: string;
    co2Text: string;
  };
}

export interface IndoorClimateWeatherSnapshot {
  address: string;
  dateFrom: string;
  dateTo: string;
  sourceName: string;
  sourceStrategy?: "single-station" | "group-fallback";
  sourceSelections?: Array<{
    parameter: string;
    sourceName: string;
    sourceId: string;
  }>;
  weatherEmoji: string;
  weatherDescription: string;
  warnings?: string[];
  maxTempC: number | null;
  minTempC: number | null;
  avgTempC: number | null;
  maxRelativeHumidity: number | null;
  minRelativeHumidity: number | null;
  avgRelativeHumidity: number | null;
  normalTempC: number | null;
  precipitationMm: number | null;
  snowDepthCm: number | null;
  avgWindMs: number | null;
  maxWindMs: number | null;
  hourly: IndoorClimateWeatherHour[];
}

export interface IndoorClimateWeatherHour {
  date: string;
  hour: number;
  timeLabel: string;
  weatherEmoji?: string;
  weatherDescription?: string;
  temperatureC: number | null;
  relativeHumidity: number | null;
  precipitationMm: number | null;
  windMs: number | null;
  maxWindMs: number | null;
  snowDepthCm: number | null;
}

export interface IndoorClimateMetadata {
  thanksText: string;
  summaryText: string;
  methodText: string;
  recommendations: string[];
  manualReferences: string[];
  referencesExtraText: string;
  appendicesIntroText: string;
  weatherInclude: boolean;
  weatherAddress: string;
  weatherLat: number | null;
  weatherLon: number | null;
  weatherDateFrom: string;
  weatherDateTo: string;
  weatherFetching: boolean;
  weatherFetchError: string;
  weatherHourFrom: number;
  weatherHourTo: number;
  weatherTableMode: "daily" | "hourly";
  weatherSnapshot: IndoorClimateWeatherSnapshot | null;
  sensors: IndoorClimateSensor[];
}

export interface IndoorClimateReportData {
  metadata: IndoorClimateMetadata;
}

export const TEMPERATURE_RANGES = [
  { workType: "Lett arbeid", min: 19, max: 26 },
  { workType: "Middels tungt arbeid", min: 16, max: 26 },
  { workType: "Tungt arbeid", min: 10, max: 26 },
] as const;

export const INDOOR_CLIMATE_REFERENCES = [
  "Arbeidstilsynets informasjonssider om inneklima.",
  "Arbeidsmiljøloven § 4-4. Krav til det fysiske arbeidsmiljøet.",
  "Arbeidsplassforskriften § 2-14. Klima og luftkvalitet.",
  "Forskrift om tekniske krav til byggverk (TEK17).",
  "Folkehelseinstituttets faglige normer og veiledning for inneklima.",
] as const;

export const INDOOR_CLIMATE_STANDARD_TEXT = {
  intro: [
    "Inneklima beskriver de fysiske og kjemiske forholdene i inneluften som påvirker mennesker i bygget. Begrepet omfatter både det atmosfæriske miljøet (luftkvalitet, gasser og partikler) og det termiske miljøet (temperatur, trekk og luftfuktighet). Et godt inneklima er avgjørende for helse, trivsel, konsentrasjon og arbeidsprestasjon.",
    "Arbeidsgiver har ansvar for at arbeidsmiljøet er fullt forsvarlig, og at inneklimaforhold vurderes systematisk. Målinger av temperatur, relativ luftfuktighet og CO2 gir et praktisk grunnlag for å vurdere om ventilasjon og termiske forhold er tilpasset aktivitet og bruksmønster.",
  ],
  legalIntro: "Vurdering av inneklima baseres blant annet på:",
  legalReferences: [
    "Arbeidsmiljøloven § 4-4 (krav til fysisk arbeidsmiljø)",
    "Arbeidsplassforskriften § 2-14 (klima og luftkvalitet)",
    "Folkehelseinstituttets faglige normer og veiledning",
    "Arbeidstilsynets veiledning om inneklima, ventilasjon og helse",
  ],
  healthIntro: "Dårlig inneklima kan bidra til:",
  healthEffects: [
    "irritasjon i øyne, nese og luftveier",
    "tørrhet i slimhinner og hud",
    "hodepine, tretthet og nedsatt konsentrasjon",
    "opplevelse av tung/stillestående luft",
    "økt risiko for ubehag ved varme eller kuldebelastning",
  ],
  healthOutro:
    "Symptombildet påvirkes av totalbelastning over tid, individuelle forskjeller og samspillet mellom ventilasjon, temperatur, fukt og aktivitet i lokalene.",
  temperatureIntro:
    "Temperaturkrav vurderes opp mot arbeidsbelastning og type arbeid. Følgende intervaller brukes som faglig utgangspunkt:",
  temperatureOutro:
    "For kontor- og stillesittende arbeid anbefales det normalt å holde temperaturen under 22 C for å redusere varmebelastning og opplevd dårlig luftkvalitet.",
  humidity: [
    "Det er normalt ikke fastsatt en generell forskriftsfestet grenseverdi for relativ luftfuktighet i arbeidslokaler. I norsk klima varierer relativ luftfuktighet gjennom året og kan i praksis ligge fra under 20 % RH til over 60 % RH avhengig av utetemperatur, ventilasjon og intern fuktbelastning.",
    "Ved lave nivåer kan ansatte oppleve tørr luft og statisk elektrisitet. Ved vedvarende høye nivåer øker risikoen for kondens og fuktrelaterte problemer. Særlig i kalde perioder bør man være oppmerksom på kondensrisiko dersom inneluften ligger over omtrent 35-40 % RH i lokaler med kalde flater eller utilstrekkelig ventilasjon.",
  ],
  co2: [
    "CO2 brukes som indikator på ventilasjonseffektivitet i forhold til personbelastning. Høye CO2-nivåer indikerer vanligvis at luftutskiftningen er lav i forhold til antall personer og aktivitet i rommet.",
    "Som praktisk vurderingsnivå brukes ofte 1000 ppm CO2 (tilsvarende ca. 1800 mg/m3).",
    "Verdier over dette nivået tilsier at ventilasjon, luftfordeling og/eller bruksmønster bør vurderes nærmere. Ved gjentatte overskridelser kan behovsstyrt ventilasjon, justert driftstid eller organisatoriske tiltak være aktuelt.",
  ],
} as const;

export const DEFAULT_INDOOR_CLIMATE_THANKS_TEXT =
  "Dr. Dropin Bedrift takker for samarbeidet i forbindelse med gjennomføring av inneklimamålinger. Bistand fra BHT i forhold til anbefalte tiltak kan bestilles direkte fra KAM, [KAM-navn], eller i bedriftsportalen portal.bedrift.drdropin.no.";

function createSensorId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function createEmptyStats(): IndoorClimateMetricStats {
  return { min: null, max: null, avg: null };
}

export function defaultSensor(): IndoorClimateSensor {
  return {
    id: createSensorId(),
    instrument: null,
    measurementPeriodStart: "",
    measurementPeriodEnd: "",
    locationName: "",
    placementDescription: "",
    placementImage: null,
    placementImageCaption: "",
    sensorReportImage: null,
    sensorReportImageCaption: "",
    chartImage: null,
    chartCaption: "Linjegraf viser temperatur (oransje), CO2 (grønn) og relativ luftfuktighet (blå) over tid.",
    stats: {
      temperature: createEmptyStats(),
      humidity: createEmptyStats(),
      co2: createEmptyStats(),
    },
    interpretation: {
      temperatureText: "",
      humidityText: "",
      co2Text: "",
    },
  };
}

export const defaultIndoorClimateMetadata: IndoorClimateMetadata = {
  thanksText: DEFAULT_INDOOR_CLIMATE_THANKS_TEXT,
  summaryText: "",
  methodText: "",
  recommendations: [],
  manualReferences: [...INDOOR_CLIMATE_REFERENCES],
  referencesExtraText: "",
  appendicesIntroText: "",
  weatherInclude: true,
  weatherAddress: "",
  weatherLat: null,
  weatherLon: null,
  // Empty until set by CSV upload or the metadata-step seed effect. This lets
  // downstream code distinguish "user/CSV picked a date" from "still default".
  weatherDateFrom: "",
  weatherDateTo: "",
  weatherFetching: false,
  weatherFetchError: "",
  weatherHourFrom: 8,
  weatherHourTo: 20,
  weatherTableMode: "daily",
  weatherSnapshot: null,
  sensors: [],
};

export const defaultIndoorClimateData: IndoorClimateReportData = {
  metadata: { ...defaultIndoorClimateMetadata },
};

export function getIndoorClimateData(state: ReportState): IndoorClimateReportData | null {
  if (state.data?.type === "indoor-climate") {
    return state.data.indoorClimate as IndoorClimateReportData;
  }
  return null;
}
