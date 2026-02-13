import type { ReportState } from "../../template-types";
import type { IndoorClimateReportData } from "./schema";
import {
  DEFAULT_INDOOR_CLIMATE_THANKS_TEXT,
  defaultSensor,
} from "./schema";

const sensorA = {
  ...defaultSensor(),
  id: "indoor-sensor-1",
  locationName: "Kontorlandskap 2. etasje",
  placementDescription:
    "Maleren ble plassert i oppholdssonen, cirka 1.2 m over gulv, utenfor direkte solinnstraling.",
  stats: {
    temperature: { min: 20.1, max: 24.8, avg: 22.7 },
    humidity: { min: 18.2, max: 34.6, avg: 25.3 },
    co2: { min: 530, max: 1180, avg: 890 },
  },
  interpretation: {
    temperatureText:
      "Temperaturen var i hovedsak innenfor anbefalt omrade, men med perioder over 22 C i arbeidstiden.",
    humidityText:
      "Relativ luftfuktighet var lav i deler av perioden, noe som kan bidra til opplevd torr luft.",
    co2Text:
      "CO2-nivaene var stort sett moderate, men med topper over 1000 ppm i perioder med hoy personbelastning.",
  },
};

const sensorB = {
  ...defaultSensor(),
  id: "indoor-sensor-2",
  locationName: "Moterom 3",
  placementDescription:
    "Maleren ble plassert pa bordhoyde i motsatt ende av tilluftsventil.",
  stats: {
    temperature: { min: 19.5, max: 23.7, avg: 21.8 },
    humidity: { min: 21.1, max: 37.4, avg: 29.2 },
    co2: { min: 610, max: 1420, avg: 1040 },
  },
  interpretation: {
    temperatureText:
      "Temperaturen var stabil med mindre variasjoner mellom morgen og ettermiddag.",
    humidityText:
      "Fuktigheten la innenfor normalt variasjonsomrade for sesongen.",
    co2Text:
      "Gjennomsnitt over 1000 ppm tilsier at ventilasjonen i perioder kan vaere underdimensjonert for rombelastningen.",
  },
};

const indoorClimateSampleData: IndoorClimateReportData = {
  metadata: {
    customerWebsiteUrl: "https://example.com",
    customerWebsiteImage: null,
    customerWebsiteImageCaption: "",
    thanksText: DEFAULT_INDOOR_CLIMATE_THANKS_TEXT,
    summaryText:
      "Malingene viser at temperatur i hovedsak er innenfor anbefalte nivaer, med enkelte varme perioder i oppholdssoner. Luftfuktighet var lav i deler av perioden, og CO2 oversteg 1000 ppm i perioder med hoy belastning i moterom. Resultatene tilsier behov for vurdering av ventilasjonsdrift og enkle driftstiltak.",
    methodText:
      "Malerne ble programmert for logging av temperatur, relativ luftfuktighet og CO2 gjennom en representativ arbeidsuke. Etter maleperioden ble data hentet ut og analysert i rapportverktoy med sammenstilling av min, max og gjennomsnitt.",
    recommendations: [
      "Vurder okt luftutskifting i moterom ved hoy personbelastning.",
      "Vurder justering av temperaturstyring i perioder med forhoyet innendors temperatur.",
      "Folg opp renhold og driftsrutiner for a redusere opplevd torr luft.",
    ],
    manualReferences: [],
    referencesExtraText: "",
    appendicesIntroText: "Vedleggene dokumenterer vaerforhold og datagrunnlag for vurderingene.",
    weatherInclude: true,
    weatherAddress: "Dronning Eufemias gate 16, Oslo",
    weatherDate: "2026-02-04",
    weatherSnapshot: {
      address: "Dronning Eufemias gate 16, Oslo",
      date: "2026-02-04",
      sourceName: "Oslo - Blindern",
      weatherEmoji: "🌦️",
      weatherDescription: "Byger",
      maxTempC: 3.4,
      minTempC: -1.2,
      avgTempC: 1.1,
      normalTempC: 0.3,
      precipitationMm: 4.8,
      snowDepthCm: 12,
      avgWindMs: 5.1,
      maxWindMs: 11.6,
    },
    sensors: [sensorA, sensorB],
  },
};

export const indoorClimateSampleReport: ReportState = {
  client: {
    orgNr: "912 345 678",
    name: "Eksempelbedrift AS",
    address: "Dronning Eufemias gate 16, 0191 Oslo",
    industry: "Administrasjon",
  },
  step: 1,
  reportType: "indoor-climate",
  sharedMetadata: {
    assignment: "Inneklimakartlegging hos Eksempelbedrift AS",
    date: "2026-02-04",
    participants: "Ola Nordmann, Kari Hansen",
    contactPerson: "Kari Hansen",
    author: "Ola Nordmann, Yrkeshygieniker",
    reportDate: "2026-02-10",
    reportSentTo: "Kari Hansen",
    advisor: "Ida Lund",
  },
  files: [],
  weather: {
    include: true,
    location: "Oslo",
    date: "2026-02-04",
    data: null,
  },
  data: {
    type: "indoor-climate",
    indoorClimate: indoorClimateSampleData,
  },
};
