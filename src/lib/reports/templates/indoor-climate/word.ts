import { HeadingLevel } from "docx";
import type { ReportState } from "../../template-types";
import {
  createBodyParagraph,
  createBulletList,
  createHeading,
  createImageParagraphs,
  createParagraphsFromText,
  createTable,
  createTitle,
  createWordDocument,
  downloadBlob,
  packWordDocumentToBlob,
  sanitizeFileNameSegment,
} from "../../word-utils";
import { formatDateRange, formatShortDate } from "./format-dates";
import {
  DEFAULT_INDOOR_CLIMATE_THANKS_TEXT,
  INDOOR_CLIMATE_REFERENCES,
  INDOOR_CLIMATE_STANDARD_TEXT,
  TEMPERATURE_RANGES,
  getIndoorClimateData,
} from "./schema";
import { buildFallbackRecommendations, getDefaultSummary } from "./pdf";

function formatValue(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  return `${value}${suffix}`;
}

function formatWeatherSourceLabel(selection: {
  parameter: string;
  sourceName: string;
  sourceId: string;
}): string {
  return `${selection.parameter}: ${selection.sourceName} (${selection.sourceId})`;
}

export function createIndoorClimateReportWordDoc(state: ReportState) {
  const indoor = getIndoorClimateData(state);
  if (!indoor) throw new Error("Cannot generate indoor climate Word document without data.");

  const metadata = indoor.metadata;
  const reportDate = state.sharedMetadata.reportDate || new Date().toISOString().split("T")[0];
  const thanksText = (metadata.thanksText || DEFAULT_INDOOR_CLIMATE_THANKS_TEXT).replace(
    "[KAM-navn]",
    state.sharedMetadata.advisor || "-"
  );
  const summaryText = metadata.summaryText.trim() || getDefaultSummary(state);
  const recommendations = metadata.recommendations.length > 0 ? metadata.recommendations : buildFallbackRecommendations(state);
  const references = metadata.manualReferences.length > 0 ? metadata.manualReferences : [...INDOOR_CLIMATE_REFERENCES];

  const children = [
    createTitle("Rapport etter kartlegging av inneklima"),
    createTable(
      [
        ["Bedrift og avdeling", state.client.name || "-"],
        ["Organisasjonsnummer", state.client.orgNr || "-"],
        ["Dato for utførelse", state.sharedMetadata.date || "-"],
        ["Deltakere", state.sharedMetadata.participants || "-"],
        ["Rapport skrevet av", state.sharedMetadata.author || "-"],
        ["Dato for rapport", reportDate],
        ["Rapport sendt til", state.sharedMetadata.reportSentTo || "-"],
        ["Kontaktperson i virksomheten", state.sharedMetadata.contactPerson || "-"],
        ["KAM i Dr. Dropin Bedrift", state.sharedMetadata.advisor || "-"],
      ],
      { firstColumnBold: true }
    ),
    ...createParagraphsFromText(thanksText),
    createHeading("Oppsummering"),
    ...createParagraphsFromText(summaryText),
    createHeading("Resultater og konklusjon"),
    ...(metadata.sensors.length === 0
      ? [createBodyParagraph("Ingen inneklimamålinger er registrert.")]
      : metadata.sensors.flatMap((sensor, index) => [
          createHeading(
            `Inneklimamåler ${index + 1}: ${sensor.locationName || "Uten lokasjonsnavn"}`,
            HeadingLevel.HEADING_2
          ),
          createBodyParagraph(sensor.placementDescription || "Plassering er ikke beskrevet."),
          ...createImageParagraphs(sensor.placementImage, sensor.placementImageCaption || "Plassering av måler."),
          ...createImageParagraphs(
            sensor.sensorReportImage,
            sensor.sensorReportImageCaption || "Bilde av måler-rapport."
          ),
          ...createImageParagraphs(
            sensor.chartImage,
            sensor.chartCaption ||
              "Linjegraf viser temperatur (oransje), CO2 (grønn) og relativ luftfuktighet (blå) over tid."
          ),
          createTable(
            [
              [
                "Minste verdi målt",
                formatValue(sensor.stats.temperature.min),
                formatValue(sensor.stats.humidity.min),
                formatValue(sensor.stats.co2.min),
              ],
              [
                "Største verdi målt",
                formatValue(sensor.stats.temperature.max),
                formatValue(sensor.stats.humidity.max),
                formatValue(sensor.stats.co2.max),
              ],
              [
                "Gjennomsnitt",
                formatValue(sensor.stats.temperature.avg),
                formatValue(sensor.stats.humidity.avg),
                formatValue(sensor.stats.co2.avg),
              ],
            ],
            {
              header: [
                sensor.locationName || "Lokasjon",
                "Temperatur i °C",
                "Relativ luftfuktighet i %RH",
                "CO2 i ppm",
              ],
            }
          ),
          createBodyParagraph(
            `Datasettet viser minimum og maksimum verdi av temperatur, luftfuktighet og CO2 som er målt ved ${sensor.locationName || "lokasjonen"}.`
          ),
          createBodyParagraph(`Temperatur: ${sensor.interpretation.temperatureText || "Ingen vurdering registrert."}`),
          createBodyParagraph(`Luftfuktighet: ${sensor.interpretation.humidityText || "Ingen vurdering registrert."}`),
          createBodyParagraph(`CO2: ${sensor.interpretation.co2Text || "Ingen vurdering registrert."}`),
        ])),
    createHeading("Om inneklima"),
    createHeading("Generell innledning", HeadingLevel.HEADING_2),
    ...INDOOR_CLIMATE_STANDARD_TEXT.intro.flatMap(createParagraphsFromText),
    createHeading("Lovhenvisninger", HeadingLevel.HEADING_2),
    createBodyParagraph(INDOOR_CLIMATE_STANDARD_TEXT.legalIntro),
    ...createBulletList([...INDOOR_CLIMATE_STANDARD_TEXT.legalReferences]),
    createHeading("Helseplager", HeadingLevel.HEADING_2),
    createBodyParagraph(INDOOR_CLIMATE_STANDARD_TEXT.healthIntro),
    ...createBulletList([...INDOOR_CLIMATE_STANDARD_TEXT.healthEffects]),
    createBodyParagraph(INDOOR_CLIMATE_STANDARD_TEXT.healthOutro),
    createHeading("Temperatur", HeadingLevel.HEADING_2),
    createBodyParagraph(INDOOR_CLIMATE_STANDARD_TEXT.temperatureIntro),
    createTable(
      TEMPERATURE_RANGES.map((range) => [range.workType, `${range.min}-${range.max}`]),
      { header: ["Arbeidstype", "Temperatur [C]"] }
    ),
    createBodyParagraph(INDOOR_CLIMATE_STANDARD_TEXT.temperatureOutro),
    createHeading("Luftfuktighet", HeadingLevel.HEADING_2),
    ...INDOOR_CLIMATE_STANDARD_TEXT.humidity.flatMap(createParagraphsFromText),
    createHeading("Karbondioksid (CO2)", HeadingLevel.HEADING_2),
    ...INDOOR_CLIMATE_STANDARD_TEXT.co2.flatMap(createParagraphsFromText),
    createHeading("Gjennomføring og metode for målinger"),
    ...(metadata.sensors.some((sensor) => sensor.instrument)
      ? [
          createTable(
            metadata.sensors
              .filter((sensor) => sensor.instrument)
              .map((sensor) => sensor.instrument!)
              .map((instrument) => [
                instrument.hva || "-",
                instrument.modell || "-",
                instrument.serienr || "-",
                instrument.sistKalibrert || "-",
                instrument.innkjopsar || "-",
                [instrument.programvareNavn, instrument.programvareVersjon].filter(Boolean).join(" ") || "-",
              ]),
            {
              header: [
                "Utstyrstype",
                "Modell",
                "Serienummer",
                "Sist kalibrert",
                "Innkjøpsår",
                "Programvare",
              ],
            }
          ),
        ]
      : []),
    ...createParagraphsFromText(
      metadata.methodText ||
        "Målerne ble programmert, sendt ut, plassert på avtalt lokasjon i måleperioden, returnert og analysert i etterkant."
    ),
    ...(metadata.weatherInclude ? [createBodyParagraph("Værstatistikk for oppdragsdato er oppgitt i vedlegg.")] : []),
    createHeading("Anbefalinger"),
    createBodyParagraph("Følgende tiltak bør vurderes:"),
    ...createBulletList(recommendations),
    createBodyParagraph("Bedriftshelsetjenesten deltar gjerne i det videre arbeidet med tiltak."),
    createHeading("Referanser"),
    ...createBulletList(references),
    ...(metadata.referencesExtraText.trim() ? createParagraphsFromText(metadata.referencesExtraText.trim()) : []),
    createHeading("Vedlegg"),
    ...(metadata.appendicesIntroText.trim() ? createParagraphsFromText(metadata.appendicesIntroText.trim()) : []),
    ...((() => {
      const appendices = state.files.map((file, index) => `Vedlegg ${index + 1}: ${file.name}`);
      if (metadata.weatherInclude && metadata.weatherSnapshot) {
        const range = formatDateRange(metadata.weatherSnapshot.dateFrom, metadata.weatherSnapshot.dateTo);
        appendices.push(
          `Vedlegg ${appendices.length + 1}: Værstatistikk fra ${metadata.weatherSnapshot.sourceName} (${range})`
        );
      }

      return appendices.length > 0
        ? createBulletList(appendices)
        : [createBodyParagraph("Ingen vedlegg er lagt til.")];
    })()),
    ...(metadata.weatherInclude && metadata.weatherSnapshot
      ? [
          createHeading("Værstatistikk", HeadingLevel.HEADING_2),
          createBodyParagraph(
            `Værtabell for måleperiode ${formatDateRange(metadata.weatherSnapshot.dateFrom, metadata.weatherSnapshot.dateTo)} (${String(
              Math.min(23, Math.max(0, metadata.weatherHourFrom))
            ).padStart(2, "0")}:00-${String(
              Math.min(23, Math.max(Math.min(23, Math.max(0, metadata.weatherHourFrom)), metadata.weatherHourTo))
            ).padStart(2, "0")}:00).`
          ),
          ...((() => {
            const weatherFrom = Math.min(23, Math.max(0, metadata.weatherHourFrom));
            const weatherTo = Math.min(23, Math.max(weatherFrom, metadata.weatherHourTo));
            const hourlyRows = metadata.weatherSnapshot!.hourly.filter(
              (row) => row.hour >= weatherFrom && row.hour <= weatherTo
            );
            const isMultiDay = metadata.weatherSnapshot!.dateFrom !== metadata.weatherSnapshot!.dateTo;

            if (hourlyRows.length === 0) {
              return [createBodyParagraph("Ingen timedata tilgjengelig for valgt tidsrom.")];
            }

            const items = [
              createTable(
                hourlyRows.map((row) => [
                  isMultiDay ? `${formatShortDate(row.date)} ${row.timeLabel}` : row.timeLabel,
                  row.weatherDescription || row.weatherEmoji || "-",
                  formatValue(row.temperatureC),
                  formatValue(row.relativeHumidity),
                  formatValue(row.precipitationMm),
                  formatValue(row.snowDepthCm),
                  formatValue(row.windMs),
                  formatValue(row.maxWindMs),
                ]),
                {
                  header: [
                    isMultiDay ? "Dato/tid" : "Tid",
                    "Vær",
                    "Temp C",
                    "RH %",
                    "Nedbør mm",
                    "Snødybde cm",
                    "Vind m/s",
                    "Kraftigste vind m/s",
                  ],
                }
              ),
            ];

            if (metadata.weatherSnapshot?.sourceSelections?.length) {
              items.push(createBodyParagraph("Målepunktene i tabellen er hentet fra følgende stasjoner:"));
              items.push(...createBulletList(metadata.weatherSnapshot.sourceSelections.map(formatWeatherSourceLabel)));
            }

            return items;
          })()),
        ]
      : []),
  ];

  return createWordDocument(children);
}

export async function generateIndoorClimateReportWordBlob(state: ReportState): Promise<Blob> {
  const doc = createIndoorClimateReportWordDoc(state);
  return await packWordDocumentToBlob(doc);
}

export async function generateIndoorClimateReportWord(state: ReportState): Promise<void> {
  const blob = await generateIndoorClimateReportWordBlob(state);
  const baseName = sanitizeFileNameSegment(state.client.name || "Kunde", "Kunde");
  downloadBlob(blob, `Inneklimarapport_${baseName}.docx`);
}
