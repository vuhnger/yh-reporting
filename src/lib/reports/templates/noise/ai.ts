import type { AIFieldConfig, ReportState } from "../../template-types";
import { getNoiseData } from "./schema";

export const noiseSystemInstruction =
  "Du er en teknisk skribent som er ekspert på akustikk og HMS. Du skriver utfyllende, forklarende og detaljerte tekster basert på måledata. Språket er formelt og saklig.";

export const noiseAIFields: Record<string, AIFieldConfig> = {
  summaryText: {
    label: "Sammendrag (ekstra tekst)",
    purpose: "Dette feltet skal utdype sammendraget med relevant, nøytral vurdering.",
    guidance:
      "Skriv 2–3 avsnitt som utdyper sammendraget med måleresultater (intervall, høyeste peak, ev. overskridelser) og vurdering. Ikke gjenta standardtekst ordrett.",
  },
  introExtraText: {
    label: "Innledning – Støy og helseeffekter (ekstra tekst)",
    purpose: "Dette feltet skal gi ekstra faglig kontekst i innledningen.",
    guidance:
      "Skriv 1–2 avsnitt som gir nøytral faglig kontekst, uten å anta arbeidsstedstype.",
  },
  thresholdsExtraText: {
    label: "Grenseverdier og tiltaksverdier (ekstra tekst)",
    purpose: "Dette feltet skal utdype forståelsen av tiltaks- og grenseverdier.",
    guidance:
      "Skriv 1–2 avsnitt som forklarer hvordan tiltaksverdier brukes i vurdering, uten å gjenta standardtekst.",
  },
  riskExtraText: {
    label: "Risikovurdering og tiltak (ekstra tekst)",
    purpose: "Dette feltet skal beskrive risikovurdering/tiltak generelt.",
    guidance:
      "Skriv 1–2 avsnitt som utdyper risikovurdering/tiltak generisk, uten å anta spesifikke forhold.",
  },
  trainingExtraText: {
    label: "Informasjon og opplæring (ekstra tekst)",
    purpose: "Dette feltet skal begrunne behov for informasjon og opplæring.",
    guidance:
      "Skriv 2–3 avsnitt som forklarer hvorfor informasjon/opplæring er viktig, og hvordan dette bidrar til etterlevelse og risikoreduksjon. Ikke anta spesifikk bransje.",
  },
  methodText: {
    label: "Gjennomføring og metode (ekstra tekst)",
    purpose: "Dette feltet skal beskrive gjennomføring/metode på et overordnet nivå.",
    guidance:
      "Skriv 1–2 avsnitt om gjennomføring basert på instrumentdata og antall målinger. Ikke oppfinn detaljer.",
  },
  findingsText: {
    label: "Resultater (ekstra tekst)",
    purpose: "Dette feltet skal introdusere måleresultatene før tabellen.",
    guidance:
      "Skriv 2–3 avsnitt som introduksjon til tabellen. Nevn variasjon mellom målepunkter og evt. overskridelser basert på tallene.",
  },
  conclusionsExtraText: {
    label: "Diskusjon (ekstra tekst)",
    purpose: "Dette feltet skal gi en samlet vurdering før per‑måling avsnitt.",
    guidance:
      "Skriv 2–3 avsnitt som binder målingene sammen. Referer til målepunkter og nivåer (LAeq/LCpeak) og pek på hovedmønster.",
  },
  recommendationsExtraText: {
    label: "Anbefalinger (ekstra tekst)",
    purpose:
      "Dette feltet skal være medarbeiderens konkrete anbefalinger/tiltak (formulert som forslag). Unngå vage formuleringer.",
    guidance:
      "Skriv 1–2 avsnitt med konkrete tiltak/forbedringer basert på måledata (f.eks. vedlikehold, skjerming, avstand, organisatoriske tiltak). Unngå vage formuleringer som «bør vurderes». Ikke kall det impulsstøy med mindre LCpeak > 130 dB(C). Knytt tiltak til faktiske målepunkter/kommentarer.",
  },
  referencesExtraText: {
    label: "Referanser (ekstra tekst)",
    purpose: "Dette feltet skal forklare at referansene er relevante kilder.",
    guidance:
      "Skriv 1 avsnitt som forklarer at referansene er relevante regelverk og veiledning.",
  },
  appendicesExtraText: {
    label: "Vedlegg (ekstra tekst)",
    purpose: "Dette feltet skal forklare hva vedleggene dokumenterer.",
    guidance:
      "Skriv 1 avsnitt om at vedlegg dokumenterer målingene og evt. detaljer.",
  },
};

export function buildNoiseAIContext(state: ReportState): Record<string, unknown> {
  const noise = getNoiseData(state);
  if (!noise) return {};

  const { measurements, thresholds } = noise;

  const mapped = measurements.map((m) => ({
    location: m.location,
    duration: m.duration,
    lex8h: m.lex8h,
    maxPeak: m.maxPeak,
    comment: m.comment,
  }));

  const numericLex = mapped
    .map((m) => Number(m.lex8h))
    .filter((v) => Number.isFinite(v));
  const numericPeak = mapped
    .map((m) => Number(m.maxPeak))
    .filter((v) => Number.isFinite(v));

  return {
    reportType: state.reportType,
    clientName: state.client.name,
    assignment: state.sharedMetadata.assignment,
    executionDate: state.sharedMetadata.date,
    reportDate: state.sharedMetadata.reportDate,
    participants: state.sharedMetadata.participants,
    measurementCount: measurements.length,
    noiseGroup: noise.metadata.noiseGroup,
    measurementSummary: {
      lexMin: numericLex.length ? Math.min(...numericLex) : null,
      lexMax: numericLex.length ? Math.max(...numericLex) : null,
      peakMax: numericPeak.length ? Math.max(...numericPeak) : null,
      thresholds,
    },
    instrument: {
      device: noise.metadata.measurementDevice,
      serial: noise.metadata.measurementSerial,
      calibrator: noise.metadata.calibratorModel,
      calibratorSerial: noise.metadata.calibratorSerial,
      lastCalibrationDate: noise.metadata.lastCalibrationDate,
    },
    attachmentsCount: state.files.length,
    measurements: mapped,
  };
}
