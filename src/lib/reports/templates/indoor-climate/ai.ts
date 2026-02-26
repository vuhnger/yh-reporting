import type { AIFieldConfig, ReportState } from "../../template-types";
import { getIndoorClimateData } from "./schema";

export const indoorClimateSystemInstruction =
  "Du er en teknisk skribent og fagperson innen inneklima og HMS. Du skriver presise, faglige og konkrete tekster på norsk bokmål basert på tilgjengelige måledata. Du skal ikke dikte opp tall, forhold eller detaljer som ikke finnes i datagrunnlaget.";

export const indoorClimateAIFields: Record<string, AIFieldConfig> = {
  summaryText: {
    label: "Oppsummering",
    purpose: "Kort helhetlig sammendrag av funn i inneklimarapporten.",
    length: "Kort og konsist: 4-7 setninger.",
    structure: "Sammenhengende tekst i ett avsnitt.",
    outputStyle: "paragraph",
    guidance:
      "Oppsummer hva som er innenfor/utenfor anbefalte nivåer for temperatur, relativ luftfuktighet og CO2. Bruk konkrete verdier fra dataene. Forklar sannsynlige årsaker og pek på at anbefalinger følger senere i rapporten.",
  },
  methodText: {
    label: "Gjennomføring og metode",
    purpose: "Beskrivelse av metoden brukt i kartleggingen.",
    outputStyle: "paragraph",
    guidance:
      "Beskriv prosessen kort: programmering, utsending, plassering, måleperiode, retur og analyse. Ta med relevante instrumentopplysninger fra dataene uten å oppfinne detaljer.",
  },
  recommendations: {
    label: "Anbefalinger",
    purpose: "Konkrete forslag til tiltak basert på funn.",
    length: "4-8 korte punkter.",
    structure: "Punktliste med ett tiltak per linje, uten nummerering.",
    outputStyle: "line-list",
    guidance:
      "Gi konkrete, gjennomførbare tiltak knyttet til ventilasjon, drift, temperaturstyring, renhold eller organisering. Hvert tiltak skal kunne knyttes direkte til funn i dataene. Unngå vage formuleringer.",
  },
  sensor_temperatureText: {
    label: "Tolking per måler - temperatur",
    purpose: "Faglig vurdering av temperaturforløpet ved en målelokasjon.",
    outputStyle: "paragraph",
    guidance:
      "Beskriv verdiområde, forhold til anbefalte grenser, eventuell døgnvariasjon og konkrete anbefalinger ved behov. Bruk kun verdier fra måleren i kontekst.",
  },
  sensor_humidityText: {
    label: "Tolking per måler - relativ luftfuktighet",
    purpose: "Faglig vurdering av relativ luftfuktighet ved en målelokasjon.",
    outputStyle: "paragraph",
    guidance:
      "Beskriv verdiområde, årsaksforhold (for eksempel kald uteluft i vinterhalvåret), mulige konsekvenser og tiltak. Bruk kun verdier fra måleren i kontekst.",
  },
  sensor_co2Text: {
    label: "Tolking per måler - CO2",
    purpose: "Faglig vurdering av CO2-nivå og ventilasjon ved en målelokasjon.",
    outputStyle: "paragraph",
    guidance:
      "Vurder målte nivåer opp mot 1000 ppm som praktisk vurderingsnivå, og forklar hva det sier om ventilasjonskapasitet. Bruk kun verdier fra måleren i kontekst.",
  },
};

export function buildIndoorClimateAIContext(state: ReportState): Record<string, unknown> {
  const indoor = getIndoorClimateData(state);
  if (!indoor) return {};

  const metadata = indoor.metadata;
  const sensors = metadata.sensors.map((sensor, index) => ({
    index: index + 1,
    id: sensor.id,
    locationName: sensor.locationName,
    placementDescription: sensor.placementDescription,
    instrument: sensor.instrument
      ? {
          hva: sensor.instrument.hva,
          modell: sensor.instrument.modell,
          serienr: sensor.instrument.serienr,
          sistKalibrert: sensor.instrument.sistKalibrert,
        }
      : null,
    stats: sensor.stats,
    interpretation: sensor.interpretation,
  }));

  return {
    reportType: state.reportType,
    clientName: state.client.name,
    assignment: state.sharedMetadata.assignment,
    executionDate: state.sharedMetadata.date,
    reportDate: state.sharedMetadata.reportDate,
    participants: state.sharedMetadata.participants,
    contactPerson: state.sharedMetadata.contactPerson,
    weatherIncluded: metadata.weatherInclude,
    weatherSnapshot: metadata.weatherSnapshot,
    recommendations: metadata.recommendations,
    sensorCount: metadata.sensors.length,
    sensors,
  };
}
