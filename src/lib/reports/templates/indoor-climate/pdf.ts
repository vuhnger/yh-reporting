import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportState } from "../../template-types";
import { applyGraphikPdfFont } from "../../pdf-font";
import { addStandardFooter } from "../../pdf-footer";
import { LIGHT_LOGO_PNG_DATA_URL } from "../../logo-light-data-url";
import {
  DEFAULT_INDOOR_CLIMATE_THANKS_TEXT,
  INDOOR_CLIMATE_REFERENCES,
  INDOOR_CLIMATE_STANDARD_TEXT,
  TEMPERATURE_RANGES,
  getIndoorClimateData,
} from "./schema";

const emojiImageCache = new Map<string, string | null>();

function getLastAutoTableY(doc: jsPDF): number | null {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? null;
}

function formatValue(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  return `${value}${suffix}`;
}

function getEmojiImageDataUrl(emoji: string): string | null {
  if (!emoji.trim()) return null;
  if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji) ?? null;
  if (typeof window === "undefined" || typeof document === "undefined") {
    emojiImageCache.set(emoji, null);
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      emojiImageCache.set(emoji, null);
      return null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '50px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2 + 2);
    const dataUrl = canvas.toDataURL("image/png");
    emojiImageCache.set(emoji, dataUrl);
    return dataUrl;
  } catch {
    emojiImageCache.set(emoji, null);
    return null;
  }
}

function getDefaultSummary(state: ReportState): string {
  const indoor = getIndoorClimateData(state);
  if (!indoor) return "";

  const sensors = indoor.metadata.sensors;
  const co2Averages = sensors
    .map((sensor) => sensor.stats.co2.avg)
    .filter((value): value is number => value !== null);

  const maxCo2 = co2Averages.length > 0 ? Math.max(...co2Averages) : null;
  const over1000 = co2Averages.filter((value) => value > 1000).length;

  const intro = `Dr. Dropin Bedrift har gjennomfort inneklimamalinger hos ${state.client.name || "kunde"} for a vurdere temperatur, relativ luftfuktighet og CO2 i utvalgte lokasjoner.`;
  const co2Summary =
    maxCo2 !== null
      ? `Hoyeste gjennomsnittlige CO2-verdi var ${maxCo2} ppm. ${
          over1000 > 0
            ? `${over1000} malepunkt oversteg 1000 ppm og indikerer behov for vurdering av ventilasjon.`
            : "Ingen malepunkt oversteg 1000 ppm."
        }`
      : "Ingen CO2-data er registrert.";
  const pointer = "Se anbefalingskapitlet for foreslatte tiltak og videre oppfolging.";

  return `${intro}\n${co2Summary}\n${pointer}`;
}

function buildFallbackRecommendations(state: ReportState): string[] {
  const indoor = getIndoorClimateData(state);
  if (!indoor) return [];

  const sensors = indoor.metadata.sensors;
  const hasHighCo2 = sensors.some((sensor) => (sensor.stats.co2.avg ?? 0) > 1000);
  const hasLowHumidity = sensors.some((sensor) => (sensor.stats.humidity.avg ?? 100) < 20);
  const hasHighTemp = sensors.some((sensor) => (sensor.stats.temperature.avg ?? 0) > 22);

  const items: string[] = [];
  if (hasHighCo2) {
    items.push("Vurder tiltak for okt luftutskifting i lokasjoner med hoy CO2-belastning.");
  }
  if (hasLowHumidity) {
    items.push("Vurder tiltak som reduserer opplevd torr luft, inkludert temperaturjustering og renholdsoppfolging.");
  }
  if (hasHighTemp) {
    items.push("Vurder temperaturstyring slik at lokalene holdes under anbefalt niva for stillesittende arbeid.");
  }
  if (items.length === 0) {
    items.push("Viderefor dagens drift med jevnlig oppfolging av ventilasjon og inneklimaparametere.");
  }
  return items;
}

export async function createIndoorClimateReportPDFDoc(state: ReportState): Promise<jsPDF> {
  const indoor = getIndoorClimateData(state);
  if (!indoor) throw new Error("Cannot generate indoor climate PDF without data.");

  const metadata = indoor.metadata;
  const doc = new jsPDF();
  await applyGraphikPdfFont(doc);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const TEAL = "#005041";
  const reportDate = state.sharedMetadata.reportDate || new Date().toISOString().split("T")[0];
  const thanksText = (metadata.thanksText || DEFAULT_INDOOR_CLIMATE_THANKS_TEXT).replace(
    "[KAM-navn]",
    state.sharedMetadata.advisor || "-"
  );
  const summaryText = metadata.summaryText.trim() || getDefaultSummary(state);

  let finalY = 20;

  const ensureSpace = (requiredHeight: number) => {
    if (finalY + requiredHeight > pageHeight - 20) {
      doc.addPage();
      finalY = 20;
    }
  };

  const renderHeading = (text: string) => {
    ensureSpace(12);
    doc.setFontSize(14);
    doc.text(text, 14, finalY);
    finalY += 7;
  };

  const renderSubHeading = (text: string) => {
    ensureSpace(10);
    doc.setFontSize(12);
    doc.text(text, 14, finalY);
    finalY += 6;
  };

  const renderParagraph = (text: string) => {
    if (!text.trim()) return;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, pageWidth - 28);
    ensureSpace(lines.length * 5 + 4);
    doc.text(lines, 14, finalY);
    finalY += lines.length * 5 + 3;
  };

  const renderBullets = (items: string[]) => {
    doc.setFontSize(10);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, pageWidth - 36);
      ensureSpace(lines.length * 5 + 4);
      doc.text("•", 16, finalY);
      doc.text(lines, 20, finalY);
      finalY += lines.length * 5 + 2;
    });
    finalY += 1;
  };

  const renderImage = (image: string | null, caption?: string) => {
    if (!image) return;

    try {
      const props = doc.getImageProperties(image);
      const maxWidth = 170;
      const rawHeight = (props.height * maxWidth) / props.width;
      const height = Math.min(Math.max(rawHeight, 30), 95);
      ensureSpace(height + (caption ? 10 : 4));
      doc.addImage(image, props.fileType || "PNG", 14, finalY, maxWidth, height);
      finalY += height + 3;
      if (caption?.trim()) {
        renderParagraph(caption.trim());
      }
    } catch {
      renderParagraph("Kunne ikke vise bilde i PDF.");
    }
  };

  // Cover header
  doc.setFillColor(TEAL);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(24);
  doc.text("Rapport etter kartlegging av inneklima", 14, 25);
  try {
    doc.addImage(LIGHT_LOGO_PNG_DATA_URL, "PNG", pageWidth - 48, 8, 34, 29);
  } catch {
    doc.setFontSize(10);
    doc.text("Dr. Dropin Bedrift", pageWidth - 45, 15);
    doc.text("Inneklimarapport", pageWidth - 45, 20);
  }

  doc.setTextColor("#000000");

  const metadataRows = [
    ["Bedrift og avdeling", state.client.name || "-"],
    ["Organisasjonsnummer", state.client.orgNr || "-"],
    ["Dato for utforelse", state.sharedMetadata.date || "-"],
    ["Deltakere", state.sharedMetadata.participants || "-"],
    ["Rapport skrevet av", state.sharedMetadata.author || "-"],
    ["Dato for rapport", reportDate],
    ["Rapport sendt til", state.sharedMetadata.reportSentTo || "-"],
    ["Kontaktperson i virksomheten", state.sharedMetadata.contactPerson || "-"],
    ["KAM i Dr. Dropin Bedrift", state.sharedMetadata.advisor || "-"],
  ];

  autoTable(doc, {
    startY: 50,
    head: [],
    body: metadataRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 240, 240], cellWidth: 65 } },
  });

  finalY = (getLastAutoTableY(doc) ?? 50) + 8;

  renderParagraph(thanksText);

  renderHeading("Oppsummering");
  renderParagraph(summaryText);

  renderHeading("Resultater og konklusjon");
  if (metadata.sensors.length === 0) {
    renderParagraph("Ingen inneklimamalinger er registrert.");
  } else {
    metadata.sensors.forEach((sensor, index) => {
      renderSubHeading(`Inneklimamaler ${index + 1}: ${sensor.locationName || "Uten lokasjonsnavn"}`);
      renderParagraph(
        sensor.placementDescription ||
          "Plassering er ikke beskrevet."
      );

      renderImage(sensor.placementImage, sensor.placementImageCaption || "Plassering av maler.");
      renderImage(
        sensor.sensorReportImage,
        sensor.sensorReportImageCaption || "Bilde av maler-rapport."
      );
      renderImage(
        sensor.chartImage,
        sensor.chartCaption ||
          "Linjegraf viser temperatur (oransje), CO2 (gronn) og relativ luftfuktighet (bla) over tid."
      );

      ensureSpace(40);
      autoTable(doc, {
        startY: finalY + 2,
        head: [[
          sensor.locationName || "Lokasjon",
          "Temperatur i °C",
          "Relativ luftfuktighet i %RH",
          "CO2 i ppm",
        ]],
        body: [
          [
            "Minste verdi malt",
            formatValue(sensor.stats.temperature.min),
            formatValue(sensor.stats.humidity.min),
            formatValue(sensor.stats.co2.min),
          ],
          [
            "Storste verdi malt",
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
        styles: { fontSize: 9 },
        headStyles: { fillColor: TEAL },
      });
      finalY = (getLastAutoTableY(doc) ?? finalY) + 6;

      renderParagraph(
        `Datasettet viser minimum og maksimum verdi av temperatur, luftfuktighet og CO2 som er malt ved ${sensor.locationName || "lokasjonen"}.`
      );

      renderParagraph(
        `Temperatur: ${sensor.interpretation.temperatureText || "Ingen vurdering registrert."}`
      );
      renderParagraph(
        `Luftfuktighet: ${sensor.interpretation.humidityText || "Ingen vurdering registrert."}`
      );
      renderParagraph(
        `CO2: ${sensor.interpretation.co2Text || "Ingen vurdering registrert."}`
      );
    });
  }

  renderHeading("Om inneklima");
  renderSubHeading("Generell innledning");
  INDOOR_CLIMATE_STANDARD_TEXT.intro.forEach(renderParagraph);

  renderSubHeading("Lovhenvisninger");
  renderParagraph(INDOOR_CLIMATE_STANDARD_TEXT.legalIntro);
  renderBullets([...INDOOR_CLIMATE_STANDARD_TEXT.legalReferences]);

  renderSubHeading("Helseplager");
  renderParagraph(INDOOR_CLIMATE_STANDARD_TEXT.healthIntro);
  renderBullets([...INDOOR_CLIMATE_STANDARD_TEXT.healthEffects]);
  renderParagraph(INDOOR_CLIMATE_STANDARD_TEXT.healthOutro);

  renderSubHeading("Temperatur");
  renderParagraph(INDOOR_CLIMATE_STANDARD_TEXT.temperatureIntro);

  ensureSpace(35);
  autoTable(doc, {
    startY: finalY + 2,
    head: [["Arbeidstype", "Temperatur [C]"]],
    body: TEMPERATURE_RANGES.map((range) => [
      range.workType,
      `${range.min}-${range.max}`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: TEAL },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40 },
    },
  });
  finalY = (getLastAutoTableY(doc) ?? finalY) + 6;
  renderParagraph(INDOOR_CLIMATE_STANDARD_TEXT.temperatureOutro);

  renderSubHeading("Luftfuktighet");
  INDOOR_CLIMATE_STANDARD_TEXT.humidity.forEach(renderParagraph);

  renderSubHeading("Karbondioksid (CO2)");
  INDOOR_CLIMATE_STANDARD_TEXT.co2.forEach(renderParagraph);

  renderHeading("Gjennomforing og metode for malinger");
  const instrumentRows = metadata.sensors
    .filter((sensor) => sensor.instrument)
    .map((sensor) => sensor.instrument!)
    .map((instrument) => [
      instrument.hva || "-",
      instrument.modell || "-",
      instrument.serienr || "-",
      instrument.sistKalibrert || "-",
      instrument.innkjopsar || "-",
      [instrument.programvareNavn, instrument.programvareVersjon].filter(Boolean).join(" ") || "-",
    ]);

  if (instrumentRows.length > 0) {
    ensureSpace(45);
    autoTable(doc, {
      startY: finalY + 2,
      head: [["Utstyrstype", "Modell", "Serienummer", "Sist kalibrert", "Innkjopsar", "Programvare"]],
      body: instrumentRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: TEAL },
    });
    finalY = (getLastAutoTableY(doc) ?? finalY) + 6;
  }

  renderParagraph(
    metadata.methodText ||
      "Malerne ble programmert, sendt ut, plassert pa avtalt lokasjon i maleperioden, returnert og analysert i etterkant."
  );
  if (metadata.weatherInclude) {
    renderParagraph("Vaerstatistikk for oppdragsdato er oppgitt i vedlegg.");
  }

  renderHeading("Anbefalinger");
  renderParagraph("Folgende tiltak bor vurderes:");
  renderBullets(
    metadata.recommendations.length > 0
      ? metadata.recommendations
      : buildFallbackRecommendations(state)
  );
  renderParagraph("Bedriftshelsetjenesten deltar gjerne i det videre arbeidet med tiltak.");

  renderHeading("Referanser");
  const references =
    metadata.manualReferences.length > 0
      ? metadata.manualReferences
      : [...INDOOR_CLIMATE_REFERENCES];
  renderBullets(references);
  if (metadata.referencesExtraText.trim()) {
    renderParagraph(metadata.referencesExtraText.trim());
  }

  renderHeading("Vedlegg");
  if (metadata.appendicesIntroText.trim()) {
    renderParagraph(metadata.appendicesIntroText.trim());
  }
  const appendices: string[] = state.files.map((file, index) => `Vedlegg ${index + 1}: ${file.name}`);
  if (metadata.weatherInclude && metadata.weatherSnapshot) {
    appendices.push(
      `Vedlegg ${appendices.length + 1}: Vaerstatistikk fra ${metadata.weatherSnapshot.sourceName} (${metadata.weatherSnapshot.date})`
    );
  }
  if (appendices.length === 0) {
    renderParagraph("Ingen vedlegg er lagt til.");
  } else {
    renderBullets(appendices);
  }
  if (metadata.weatherInclude && metadata.weatherSnapshot) {
    const weatherFrom = Math.min(23, Math.max(0, metadata.weatherHourFrom));
    const weatherTo = Math.min(23, Math.max(weatherFrom, metadata.weatherHourTo));
    const hourlyRows = metadata.weatherSnapshot.hourly.filter(
      (row) => row.hour >= weatherFrom && row.hour <= weatherTo
    );

    renderParagraph(
      `Vaertabell for oppdragsdato ${metadata.weatherSnapshot.date} (${String(weatherFrom).padStart(2, "0")}:00-${String(weatherTo).padStart(2, "0")}:00).`
    );

    if (hourlyRows.length === 0) {
      renderParagraph("Ingen timedata tilgjengelig for valgt tidsrom.");
    } else {
      ensureSpace(40);
      const hourlyEmojiImages = hourlyRows.map((row) => getEmojiImageDataUrl(row.weatherEmoji ?? ""));
      autoTable(doc, {
        startY: finalY + 2,
        head: [["Tid", "Vaer", "Temp C", "Nedbor mm", "Snodybde cm", "Vind m/s", "Kraftigste vind m/s"]],
        body: hourlyRows.map((row) => [
          row.timeLabel,
          row.weatherDescription ?? "-",
          formatValue(row.temperatureC),
          formatValue(row.precipitationMm),
          formatValue(row.snowDepthCm),
          formatValue(row.windMs),
          formatValue(row.maxWindMs),
        ]),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: TEAL },
        didParseCell: (hookData) => {
          if (hookData.section === "body" && hookData.column.index === 1) {
            hookData.cell.styles.cellPadding = {
              top: 1.5,
              right: 1.5,
              bottom: 1.5,
              left: 9,
            };
          }
        },
        didDrawCell: (hookData) => {
          if (hookData.section !== "body" || hookData.column.index !== 1) return;
          const image = hourlyEmojiImages[hookData.row.index];
          if (!image) return;

          const iconSize = Math.min(4.2, Math.max(2.8, hookData.cell.height - 2));
          const iconX = hookData.cell.x + 1.4;
          const iconY = hookData.cell.y + (hookData.cell.height - iconSize) / 2;
          try {
            doc.addImage(image, "PNG", iconX, iconY, iconSize, iconSize);
          } catch {
            // best-effort icon rendering
          }
        },
      });
      finalY = (getLastAutoTableY(doc) ?? finalY) + 5;
    }
  }

  addStandardFooter(doc);
  return doc;
}

export async function generateIndoorClimateReportPDFBlob(state: ReportState): Promise<Blob> {
  const doc = await createIndoorClimateReportPDFDoc(state);
  return doc.output("blob");
}

export async function generateIndoorClimateReportPDF(state: ReportState): Promise<void> {
  const doc = await createIndoorClimateReportPDFDoc(state);
  const baseName = (state.client.name || "Kunde").replace(/\s+/g, "_");
  doc.save(`Inneklimarapport_${baseName}.pdf`);
}
