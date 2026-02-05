import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportState } from "../../template-types";
import { getNoiseData } from "./schema";

export function createNoiseReportPDFDoc(state: ReportState) {
  const noise = getNoiseData(state);
  if (!noise) throw new Error("Cannot generate noise PDF without noise data");
  const { metadata: noiseMeta, measurements, thresholds } = noise;

  const noiseGroupDetails = {
    I: {
      label: "Støygruppe I",
      max: 55,
      basis: "LAeq,1h",
      description:
        "Arbeidsforhold med store krav til vedvarende konsentrasjon eller behov for uanstrengt samtale (kontor, undervisningsrom, møterom, spise- og hvilerom).",
    },
    II: {
      label: "Støygruppe II",
      max: 70,
      basis: "LAeq,1h",
      description:
        "Arbeidsforhold der det er viktig å føre samtale, eller vedvarende store krav til presisjon, hurtighet eller oppmerksomhet (kontrollrom, laboratorier, lett monteringsarbeid).",
    },
    III: {
      label: "Støygruppe III",
      max: 85,
      basis: "LAeq,8h",
      description:
        "Arbeidsforhold med støyende maskiner og utstyr som ikke går under gruppe I og II (maskinverksteder, byggeplasser, produksjonshaller).",
    },
  } as const;
  const selectedGroup = noiseGroupDetails[noiseMeta.noiseGroup];

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const TEAL = "#005041";

  const reportDate = state.sharedMetadata.reportDate || new Date().toISOString().split("T")[0];
  const defaultSummary = buildSummaryFromMeasurements(state);
  const summaryText = noiseMeta.summaryText?.trim() || defaultSummary;

  // --- Cover Header ---
  doc.setFillColor(TEAL);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(24);
  doc.text("Rapport etter kartlegging av støy", 14, 25);

  doc.setFontSize(10);
  doc.text("Dr. Dropin Bedrift", pageWidth - 40, 15);
  doc.text("Støyrapport", pageWidth - 40, 20);

  // --- Cover: Client Info Table ---
  doc.setTextColor("#000000");
  doc.setFontSize(12);

  const clientData = [
    ["Bedrift og avdeling", state.client.name],
    ["Organisasjonsnummer", state.client.orgNr],
    ["Oppdrag", state.sharedMetadata.assignment || "Støykartlegging"],
    ["Dato for utførelse", state.sharedMetadata.date],
    ["Deltakere", state.sharedMetadata.participants],
    ["Antall vedlegg", state.files.length ? String(state.files.length) : "-"],
    ["Rapport skrevet av", state.sharedMetadata.author],
    ["Dato for rapport", reportDate],
    ["Rapport sendt til", state.sharedMetadata.reportSentTo || "-"],
    ["Kontaktperson i virksomheten", state.sharedMetadata.contactPerson || "-"],
    ["KAM/HMS-rådgiver i Dr. Dropin Bedrift", state.sharedMetadata.advisor || "-"],
  ];

  autoTable(doc, {
    startY: 50,
    head: [],
    body: clientData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 60 } },
  });

  // --- New Page for Report Body ---
  doc.addPage();
  let finalY = 20;

  const ensureSpace = (requiredHeight: number) => {
    if (finalY + requiredHeight > pageHeight - 20) {
      doc.addPage();
      finalY = 20;
    }
  };

  const renderHeading = (text: string) => {
    ensureSpace(14);
    doc.setFontSize(14);
    doc.text(text, 14, finalY);
    finalY += 7;
  };

  const renderParagraph = (text: string) => {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, pageWidth - 28);
    ensureSpace(lines.length * 5 + 6);
    doc.text(lines, 14, finalY);
    finalY += lines.length * 5 + 4;
  };

  const renderBullets = (items: string[]) => {
    doc.setFontSize(10);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, pageWidth - 36);
      ensureSpace(lines.length * 5 + 6);
      doc.text("•", 16, finalY);
      doc.text(lines, 20, finalY);
      finalY += lines.length * 5 + 2;
    });
    finalY += 2;
  };

  // --- Summary ---
  renderHeading("Sammendrag");
  renderParagraph(summaryText);

  // --- Introduction ---
  renderHeading("Innledning");

  doc.setFontSize(12);
  doc.text("Støy og helseeffekter", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Støy er definert som uønsket lyd, og deles gjerne inn i to typer:"
  );
  renderBullets([
    "Irriterende støy fra for eksempel ventilasjonsanlegg, vifte i PC-en og lignende.",
    "Skadelig støy fra støyende omgivelser > 80 dB(A) og impulslyd > 130 dB(C).",
  ]);
  renderParagraph(
    "Arbeidsgiver skal sikre at arbeidsmiljøet er fullt forsvarlig. Dette gjelder også i hvilken grad støy påvirker arbeidstakernes helse, miljø, sikkerhet og velferd."
  );
  renderParagraph(
    "Lydtrykknivå/støynivå måles i desibel (dB). En alminnelig samtale ligger på omkring 65 dB, mens et rop når opp i ca. 80 dB. Skalaen er slik at hver gang lydtrykknivået dobles øker desibelnivået med tre dB. Lydtrykknivået av for eksempel 83 dB vil derfor være dobbelt så høy som av 80 dB."
  );
  renderParagraph(
    "Det er ikke bare lydtrykknivået som er avgjørende for om en lyd er skadelig eller ikke. Hvor lenge støyen varer og hvor ofte man blir utsatt for den er også viktig. Derfor måles støy over tid. Måling av støy på arbeidsplassen er som regel basert på samlet støyeksponering over en hel arbeidsdag."
  );
  renderParagraph(
    "Opplevelsen av støy er subjektiv, noe som medfører at ulike personer kan ha ulik oppfattelse/sensitivitet av samme støynivå."
  );
  renderParagraph(
    "Sterk støy og/eller høy impulslyd kan gi hørselstap og kronisk øresus (tinitus). I tillegg kan støy også gi andre helseproblemer som:"
  );
  renderBullets([
    "gi høyt blodtrykk",
    "påvirke hjerte og karsystemet",
    "bidra til stress",
    "virke irriterende, trøttende og redusere konsentrasjonsevnen",
    "bidra til muskelspenninger, fordøyelsesproblem, osv.",
    "påvirke ufødte barn",
  ]);
  renderParagraph(
    "Flere av disse helseeffektene kan oppstå selv når lydnivået er relativt lavt."
  );
  if (noiseMeta.introExtraText?.trim()) {
    renderParagraph(noiseMeta.introExtraText.trim());
  }

  doc.setFontSize(12);
  doc.text("Grenseverdier og tiltaksverdier", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Det er utarbeidet en forskrift hjemlet i arbeidsmiljøloven som definerer tiltaks- og grenseverdier for støy ved ulikt arbeid (tabell 1). Tiltaksverdier er verdier for støyeksponering som krever iverksetting av tiltak for å redusere helserisikoen og uheldig belastning til et minimum. Grenseverdier er verdier for eksponering som ikke skal overskrides. Grenseverdi og øvre tiltaksverdi er det samme."
  );

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Støygruppe", "Arbeidsforhold", "Maks LAeq"]],
    body: [
      [
        "I",
        "Stiller store krav til vedvarende konsentrasjon eller behov for å føre uanstrengt samtale og i spise- og hvilerom",
        "55 dB(A) (LAeq,1h)",
      ],
      [
        "II",
        "Viktig å føre samtale eller vedvarende store krav til presisjon, hurtighet eller oppmerksomhet",
        "70 dB(A) (LAeq,1h)",
      ],
      [
        "III",
        "Støyende maskiner og utstyr under forhold som ikke går innunder arbeidsgruppe I og II",
        "85 dB(A) (LAeq,8h)",
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: TEAL },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 95 },
      2: { cellWidth: 70 },
    },
  });
  finalY = (doc as any).lastAutoTable.finalY + 10;

  renderParagraph(
    `${selectedGroup.label} er valgt for denne rapporten. Maksnivå for ${selectedGroup.basis} er ${selectedGroup.max} dB(A). ${selectedGroup.description}`
  );

  renderParagraph(
    "Dersom grenseverdiene for støyeksponering overskrides, skal arbeidsgiveren sette i verk strakstiltak for å redusere støyen. Årsakene til at grenseverdiene er overskredet skal kartlegges. Dersom grenseverdiene (de øvre tiltaksverdiene) ikke kan overholdes med tekniske eller administrative tiltak skal arbeidsgiveren påse at hensiktsmessig hørselsvern, som gir tilstrekkelig beskyttelse, benyttes. Inngangen til rom eller arbeidsområder med slik støy skal merkes med varselskilt."
  );
  renderParagraph(
    "Dersom nedre tiltaksverdier overskrides, skal arbeidsgiveren lage en skriftlig tiltaksplan med tekniske eller administrative tiltak for å redusere støyeksponeringen med minst 10 dB under tiltaksverdien. Når LEX,8h = 80 dB(A) overskrides eller arbeidstakeren opplever lydnivået sjenerende skal hørselsvern velges ut i samråd med arbeidstaker og stilles til rådighet."
  );
  renderParagraph(
    "For arbeidsgruppene I og II, skal støy fra egen aktivitet ikke inngå i vurderingen i forhold til nedre tiltaksverdi så lenge arbeidstakeren selv kan avbryte støyen. For spise- og hvilerom skal kun bakgrunnsstøy fra installasjoner, tilstøtende lokaler og omgivelser inngå i vurderingen."
  );
  if (noiseMeta.thresholdsExtraText?.trim()) {
    renderParagraph(noiseMeta.thresholdsExtraText.trim());
  }

  doc.setFontSize(12);
  doc.text("Risikovurdering og tiltak", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Ifølge Forskrift om utførelse av arbeid, § 14, skal arbeidsgiver gjennomføre og dokumentere en risikovurdering. Denne skal oppdateres ved endringer i produksjonsforhold eller organisering av arbeidet. På bakgrunn av de helse- og sikkerhetsrisikoer som fremkommer, skal arbeidsgiver sørge for at risiko forårsaket av støy fjernes eller reduseres til et lavest mulig nivå, ved å:"
  );
  renderBullets([
    "vurdere alternative arbeidsmetoder",
    "velge hensiktsmessig arbeidsutstyr som gir minst mulig støy",
    "utforme og tilrettelegge arbeidsplassen og arbeidslokalene",
    "bruke skjermer / innbygging / lydabsorbenter etc. for å dempe lydutbredelse gjennom luft",
    "redusere strukturlyd og vibrasjoner ved å avbalansere, dempe eller isolere lydkilder",
    "ha systematisk vedlikehold av arbeidsutstyr, arbeidsplassen og støydempingstiltak",
    "tilrettelegge for begrensning av eksponeringstid og intensitet, og med støyfrie hvileperioder",
    "sørge for helseundersøkelser.",
  ]);
  if (noiseMeta.riskExtraText?.trim()) {
    renderParagraph(noiseMeta.riskExtraText.trim());
  }

  doc.setFontSize(12);
  doc.text("Informasjon og opplæring", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Arbeidstakere og verneombud skal ha løpende informasjon og opplæring om aktuell risiko i forbindelse med støy dersom arbeidstakerne utsettes for støy som er lik eller overskrider LEX,8h ≥ 80 dB (A) eller LpC,peak ≥ 130 dB (C)."
  );
  if (noiseMeta.trainingExtraText?.trim()) {
    renderParagraph(noiseMeta.trainingExtraText.trim());
  }

  // --- Method Section + Table ---
  renderHeading("Gjennomføring og metode for målinger");
  renderParagraph(
    `Måling er utført med ${noiseMeta.measurementDevice || "-"}, Serienr.: ${noiseMeta.measurementSerial || "-"}. ` +
      `Måleren er egenkalibrert før og etter målingene med kalibrator ${noiseMeta.calibratorModel || "-"}, ` +
      `Serial No: ${noiseMeta.calibratorSerial || "-"}. Siste kontroll og kalibrering på utstyret er ` +
      `${noiseMeta.lastCalibrationDate || "-"}.`
  );

  if (noiseMeta.methodText?.trim()) {
    renderParagraph(noiseMeta.methodText.trim());
  }

  const tableBody = measurements.map((m) => [
    m.location,
    m.duration || "-",
    "-",
    "-",
    m.comment || "",
  ]);

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Sted", "Måling 1", "Måling 2", "Måling 3", "Kommentar"]],
    body: tableBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: TEAL },
  });
  finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- Findings Section ---
  renderHeading("Resultater");
  doc.setFontSize(12);
  doc.text("Måling av støy", 14, finalY);
  finalY += 6;
  if (noiseMeta.findingsText?.trim()) {
    renderParagraph(noiseMeta.findingsText.trim());
  }
  renderParagraph(
    "Måleresultatene er gitt i tabell 2. LAeq (dB A) er brukt i resultatene fordi støyen i hovedsak er kontinuerlig over tid, og LAeq‑verdiene gir dermed en god indikasjon på 8‑timers eksponering."
  );
  renderParagraph(
    `Lydnivå over grenseverdien (LAeq > ${thresholds.lex8h.red} dB(A) eller LCpeak > ${thresholds.peak.red} dB(C)) vises med rødt. ` +
      `Lydnivå over nedre tiltaksverdi (LAeq > ${thresholds.lex8h.orange} dB(A)) vises med oransje. ` +
      `Lydnivå over anbefalt nivå (LAeq > ${thresholds.lex8h.yellow} dB(A) eller LCpeak > ${thresholds.peak.yellow} dB(C)) vises med gult.`
  );

  const resultBody = measurements.map((m) => [
    m.location,
    m.duration,
    m.lex8h !== "" ? `${m.lex8h} dB A` : "-",
    m.maxPeak !== "" ? `${m.maxPeak} dB C` : "-",
    m.comment,
  ]);

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Målested", "Varighet", "LAeq (dB A)", "LCpeak (dB C)", "Kommentar"]],
    body: resultBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: TEAL },
    didParseCell: (data) => {
      if (data.section === "body") {
        const rawRow = measurements[data.row.index];
        const lex = Number(rawRow.lex8h);
        const peak = Number(rawRow.maxPeak);

        if (data.column.index === 2) {
          if (lex > thresholds.lex8h.red) {
            data.cell.styles.fillColor = [255, 200, 200];
          } else if (lex > thresholds.lex8h.orange) {
            data.cell.styles.fillColor = [255, 230, 200];
          } else if (lex > thresholds.lex8h.yellow) {
            data.cell.styles.fillColor = [255, 255, 200];
          } else {
            data.cell.styles.fillColor = [200, 240, 200];
          }
        }

        if (data.column.index === 3) {
          if (peak > thresholds.peak.red) {
            data.cell.styles.fillColor = [255, 200, 200];
          } else if (peak > thresholds.peak.yellow) {
            data.cell.styles.fillColor = [255, 255, 200];
          } else {
            data.cell.styles.fillColor = [200, 240, 200];
          }
        }
      }
    },
  });
  finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- Discussion ---
  renderHeading("Diskusjon");
  renderParagraph(
    "Generelt viste målingene at det ikke er registrert impulsstøy over 130 dB(C). Videre følger en kort vurdering per målepunkt, basert på registrerte nivåer, varighet og tilgjengelig informasjon."
  );
  if (noiseMeta.conclusionsExtraText?.trim()) {
    renderParagraph(noiseMeta.conclusionsExtraText.trim());
  }

  // --- Conclusions per Measurement ---
  renderHeading("Konklusjon");
  measurements.forEach((m) => {
    const lex = Number(m.lex8h);
    const peak = Number(m.maxPeak);
    const parts: string[] = [];
    if (Number.isFinite(lex)) {
      if (lex > thresholds.lex8h.red) {
        parts.push(`LAeq (${lex} dB) overstiger øvre tiltaksverdi.`);
      } else if (lex > thresholds.lex8h.orange) {
        parts.push(`LAeq (${lex} dB) overstiger nedre tiltaksverdi for støyende arbeid.`);
      } else if (lex > thresholds.lex8h.yellow) {
        parts.push(`LAeq (${lex} dB) ligger over anbefalt nivå.`);
      } else {
        parts.push(`LAeq (${lex} dB) ligger under anbefalte nivåer.`);
      }
    }
    if (Number.isFinite(peak)) {
      if (peak > thresholds.peak.red) {
        parts.push(`LCpeak‑nivå (${peak} dB(C)) overstiger grenseverdi.`);
      } else if (peak > thresholds.peak.yellow) {
        parts.push(`LCpeak‑nivå (${peak} dB(C)) ligger over anbefalt nivå.`);
      }
    }
    const durationText = m.duration ? `Varighet: ${m.duration}.` : "";
    const commentText = m.comment ? `Kommentar: ${m.comment}.` : "";
    const paragraph =
      `${m.location}: ${parts.join(" ")} ${durationText} ${commentText}`.trim();
    renderParagraph(paragraph);
  });

  // --- Recommendations ---
  renderHeading("Anbefalinger");
  renderBullets(buildRecommendations(measurements, thresholds));
  if (noiseMeta.recommendationsExtraText?.trim()) {
    renderParagraph(noiseMeta.recommendationsExtraText.trim());
  }

  // --- References ---
  renderHeading("Referanser");
  renderBullets([
    "Arbeidstilsynets informasjonsside om støy.",
    "Arbeidsmiljøloven § 4-4. Krav til det fysiske arbeidsmiljøet.",
    "Arbeidsplassforskriften § 2-16. Støy og vibrasjoner.",
    "Forskrift om utførelse av arbeid § 14 Arbeid som kan medføre eksponering for støy eller mekaniske vibrasjoner.",
    "Forskrift om tekniske krav til byggverk (TEK17).",
    "Forskrift om tiltaks- og grenseverdier § 2 Støy.",
  ]);
  if (noiseMeta.referencesText?.trim()) {
    const manualReferences = noiseMeta.referencesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (manualReferences.length > 0) {
      renderBullets(manualReferences);
    }
  }
  if (noiseMeta.referencesExtraText?.trim()) {
    renderParagraph(noiseMeta.referencesExtraText.trim());
  }

  // --- Appendices ---
  renderHeading("Vedlegg");
  if (state.files.length === 0) {
    renderParagraph("Ingen vedlegg er lagt til.");
  } else {
    renderBullets(state.files.map((file, index) => `Vedlegg ${index + 1} – ${file.name}`));
  }
  if (noiseMeta.appendicesExtraText?.trim()) {
    renderParagraph(noiseMeta.appendicesExtraText.trim());
  }

  return doc;
}

export function generateNoiseReportPDFBlob(state: ReportState): Blob {
  const doc = createNoiseReportPDFDoc(state);
  return doc.output("blob");
}

export function generateNoiseReportPDF(state: ReportState): void {
  const doc = createNoiseReportPDFDoc(state);
  doc.save(`Stoyrapport_${state.client.name.replace(/\s+/g, "_")}.pdf`);
}

function buildSummaryFromMeasurements(state: ReportState) {
  const noise = getNoiseData(state);
  if (!noise) return "";
  const { measurements, thresholds } = noise;
  const { client } = state;

  const numericLex = measurements
    .map((m) => Number(m.lex8h))
    .filter((v) => Number.isFinite(v));
  const numericPeak = measurements
    .map((m) => Number(m.maxPeak))
    .filter((v) => Number.isFinite(v));

  const lexMin = numericLex.length ? Math.min(...numericLex) : null;
  const lexMax = numericLex.length ? Math.max(...numericLex) : null;
  const peakMax = numericPeak.length ? Math.max(...numericPeak) : null;

  const overYellow = measurements.filter(
    (m) => Number(m.lex8h) > thresholds.lex8h.yellow
  ).length;
  const overOrange = measurements.filter(
    (m) => Number(m.lex8h) > thresholds.lex8h.orange
  ).length;
  const overRed = measurements.filter(
    (m) => Number(m.lex8h) > thresholds.lex8h.red || Number(m.maxPeak) > thresholds.peak.red
  ).length;

  const intro =
    `Dr.Dropin BHT har bistått ${client.name} med kartlegging av eksponering for støy. ` +
    `Stasjonære støymålinger ble gjennomført på utvalgte arbeidsområder der ansatte oppholder seg og utfører arbeidsoppgaver. ` +
    `Målingene er basert på representative aktiviteter og driftssituasjoner, slik at resultatene gir et realistisk bilde av eksponeringen. ` +
    `Støymålingene ble utført med stasjonær måler som var egenkalibrert før og etter målingene. ` +
    `Formålet var å vurdere de ansattes eksponering for støy i henhold til gjeldende regelverk og anbefalte tiltaksverdier.`;

  const rangeText =
    lexMin !== null && lexMax !== null
      ? `Målingene viser en variasjon i lydnivå fra ${lexMin} dB(A) til ${lexMax} dB(A), som reflekterer forskjeller i aktivitet, avstand og arbeidsoppgaver mellom målepunktene.`
      : `Måleresultatene viser nivåer innenfor de registrerte målingene.`;

  const exceedanceParts: string[] = [];
  if (overRed > 0) {
    exceedanceParts.push(
      `${overRed} måling(er) oversteg øvre tiltaksverdi/grenseverdi (${thresholds.lex8h.red} dB(A) eller ${thresholds.peak.red} dB(C)).`
    );
  }
  if (overOrange > 0) {
    exceedanceParts.push(
      `${overOrange} måling(er) oversteg nedre tiltaksverdi for støyende arbeid (${thresholds.lex8h.orange} dB(A)).`
    );
  }
  if (overYellow > 0) {
    exceedanceParts.push(
      `${overYellow} måling(er) oversteg anbefalt nivå (${thresholds.lex8h.yellow} dB(A) eller ${thresholds.peak.yellow} dB(C)).`
    );
  }

  const exceedanceText =
    exceedanceParts.length > 0
      ? `Måleresultatene viser at ${exceedanceParts.join(" ")}`
      : `Måleresultatene viste at ingen målinger oversteg anbefalte nivåer eller tiltaksverdier.`;

  const peakText =
     peakMax !== null
      ? `Høyeste registrerte LCpeak‑nivå var ${peakMax} dB(C). Dette indikerer at det ikke er registrert impulsstøy over gjeldende grenseverdier.`
      : `LCpeak‑nivåer ble ikke registrert.`;

  const recommendationText =
    overRed > 0 || overOrange > 0 || overYellow > 0
      ? `BHT anbefaler å vurdere tiltak i områder med høyest støynivå, samt systematisk vedlikehold av utstyr og tekniske installasjoner.`
      : `Støynivået fremstår akseptabelt, men BHT anbefaler systematisk vedlikehold og oppfølging for å sikre stabile nivåer over tid.`;

  return `${intro}\n${exceedanceText} ${rangeText} ${peakText}\n${recommendationText}`;
}

function buildRecommendations(
  measurements: { lex8h: number | ""; maxPeak: number | "" }[],
  thresholds: { lex8h: { red: number; orange: number; yellow: number }; peak: { red: number; yellow: number } }
) {
  const hasRed =
    measurements.some((m) => Number(m.lex8h) > thresholds.lex8h.red) ||
    measurements.some((m) => Number(m.maxPeak) > thresholds.peak.red);
  const hasOrange = measurements.some((m) => Number(m.lex8h) > thresholds.lex8h.orange);
  const hasYellow =
    measurements.some((m) => Number(m.lex8h) > thresholds.lex8h.yellow) ||
    measurements.some((m) => Number(m.maxPeak) > thresholds.peak.yellow);

  const items: string[] = [];
  if (hasRed || hasOrange || hasYellow) {
    items.push("Vurder tiltak i områder med forhøyede støynivåer.");
    items.push("Sørg for jevnlig vedlikehold av utstyr og tekniske installasjoner.");
    items.push("Vurder organisatoriske tiltak som redusert eksponeringstid og rotering.");
    if (hasRed) {
      items.push("Vurder hørselsvern og merk områder med høy støy.");
    }
  } else {
    items.push("Støynivået vurderes som akseptabelt ut fra de registrerte målingene.");
    items.push("Fortsett med jevnlig vedlikehold og sørg for at utstyr og installasjoner er i god stand.");
  }
  items.push("Bedriftshelsetjenesten deltar gjerne i det videre arbeidet med tiltak.");
  return items;
}
