import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportState } from "@/components/wizard/wizard-context";

export function createNoiseReportPDFDoc(state: ReportState) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Brand Colors (Approximate for PDF)
  const TEAL = "#005041";

  const reportDate = state.metadata.reportDate || new Date().toISOString().split("T")[0];
  const defaultSummary = buildSummaryFromMeasurements(state);
  const summaryText = state.metadata.summaryText?.trim() || defaultSummary;

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
    ["Oppdrag", state.metadata.assignment || "Støykartlegging"],
    ["Dato for utførelse", state.metadata.date],
    ["Deltakere", state.metadata.participants],
    ["Antall vedlegg", state.files.length ? String(state.files.length) : "-"],
    ["Rapport skrevet av", state.metadata.author],
    ["Dato for rapport", reportDate],
    ["Rapport sendt til", state.metadata.reportSentTo || "-"],
    ["Kontaktperson i virksomheten", state.metadata.contactPerson || "-"],
    ["KAM/HMS-rådgiver i Dr. Dropin Bedrift", state.metadata.advisor || "-"],
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
    const currentY = doc.getCurrentPageInfo().pageNumber === 1 ? finalY : finalY;
    if (currentY + requiredHeight > pageHeight - 20) {
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
    "Støy er uønsket lyd. Den kan være irriterende (for eksempel fra ventilasjon eller vifter) eller skadelig ved høyere nivåer."
  );
  renderParagraph(
    "Arbeidsgiver skal sikre et fullt forsvarlig arbeidsmiljø. Det innebærer å vurdere hvordan støy påvirker helse, sikkerhet og velferd."
  );
  renderParagraph(
    "Lydnivå måles i desibel (dB). En vanlig samtale ligger rundt 65 dB, mens rop kan være rundt 80 dB. Skalaen øker logaritmisk, og en økning på 3 dB tilsvarer omtrent en dobling av lydenergi."
  );
  renderParagraph(
    "Det er ikke bare nivået som betyr noe. Varighet og hyppighet er også viktige, og støy vurderes derfor ofte som samlet eksponering over en hel arbeidsdag."
  );
  renderParagraph(
    "Sterk støy eller høy impulslyd kan gi hørselstap og tinnitus. Støy kan også bidra til stress, konsentrasjonsvansker og andre helseplager."
  );
  renderBullets([
    "høyt blodtrykk og påvirkning av hjerte‑ og karsystemet",
    "stress, irritasjon og redusert konsentrasjon",
    "muskelspenninger og fordøyelsesplager",
    "påvirkning av ufødte barn",
  ]);

  doc.setFontSize(12);
  doc.text("Grenseverdier og tiltaksverdier", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Det er utarbeidet forskrifter som definerer tiltaks- og grenseverdier for støy ved ulikt arbeid. Tiltaksverdier er nivåer som krever at arbeidsgiver vurderer og iverksetter tiltak, mens grenseverdier ikke skal overskrides."
  );
  renderParagraph(
    "Dersom grenseverdiene for støyeksponering overskrides, skal arbeidsgiver sette i verk strakstiltak for å redusere støyen og kartlegge årsakene. Dersom grenseverdiene (øvre tiltaksverdier) ikke kan overholdes med tekniske eller administrative tiltak, skal hensiktsmessig hørselsvern benyttes og området merkes."
  );
  renderParagraph(
    "Dersom nedre tiltaksverdier overskrides, skal arbeidsgiver lage en skriftlig tiltaksplan med tekniske eller administrative tiltak for å redusere støyeksponeringen. Ved LEX,8h = 80 dB(A) eller ved opplevd sjenerende støy skal hørselsvern vurderes i samråd med arbeidstaker."
  );
  renderParagraph(
    "For arbeidsgruppene I og II skal støy fra egen aktivitet ikke inngå i vurderingen av nedre tiltaksverdi dersom arbeidstakeren selv kan avbryte støyen. For spise- og hvilerom skal kun bakgrunnsstøy fra installasjoner, tilstøtende lokaler og omgivelser inngå."
  );

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Støygruppe", "Arbeidsforhold", "Tiltaks-/grenseverdier"]],
    body: [
      [
        "I",
        "Stiller store krav til vedvarende konsentrasjon eller behov for å føre uanstrengt samtale og i spise- og hvilerom",
        "Nedre tiltaksverdi LEX,1h = 55 dB(A)",
      ],
      [
        "II",
        "Viktig å føre samtale eller vedvarende store krav til presisjon, hurtighet eller oppmerksomhet",
        "Nedre tiltaksverdi LEX,1h = 70 dB(A)",
      ],
      [
        "III",
        "Støyende maskiner og utstyr under forhold som ikke går innunder arbeidsgruppe I og II",
        "Nedre tiltaksverdi LEX,8h = 80 dB(A)",
      ],
      [
        "Alle",
        "Øvre tiltaksverdi / grenseverdi",
        "LEX,8h = 85 dB(A) og LpC,peak = 130 dB(C)",
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

  doc.setFontSize(12);
  doc.text("Informasjon og opplæring", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Arbeidstakere og verneombud skal ha løpende informasjon og opplæring om aktuell risiko i forbindelse med støy dersom arbeidstakerne utsettes for støy som er lik eller overskrider LEX,8h ≥ 80 dB(A) eller LpC,peak ≥ 130 dB(C)."
  );

  doc.setFontSize(12);
  doc.text("Risikovurdering og tiltak", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Ifølge Forskrift om utførelse av arbeid § 14 skal arbeidsgiver gjennomføre og dokumentere en risikovurdering. Denne skal oppdateres ved endringer i produksjonsforhold eller organisering av arbeidet. På bakgrunn av de helse- og sikkerhetsrisikoer som fremkommer, skal arbeidsgiver sørge for at risiko forårsaket av støy fjernes eller reduseres til et lavest mulig nivå ved å:"
  );
  renderBullets([
    "vurdere alternative arbeidsmetoder",
    "velge hensiktsmessig arbeidsutstyr som gir minst mulig støy",
    "utforme og tilrettelegge arbeidsplassen og arbeidslokalene",
    "bruke skjermer, innbygging og lydabsorbenter for å dempe lydutbredelse gjennom luft",
    "redusere strukturlyd og vibrasjoner ved å avbalansere, dempe eller isolere lydkilder",
    "ha systematisk vedlikehold av arbeidsutstyr, arbeidsplassen og støydempingstiltak",
    "tilrettelegge for begrensning av eksponeringstid og intensitet, med støyfrie hvileperioder",
    "sørge for helseundersøkelser",
  ]);

  // --- Method Section + Table ---
  renderHeading("Gjennomføring og metode for målinger");
  renderParagraph(
    `Måling er utført med ${state.metadata.measurementDevice || "-"}, Serienr.: ${state.metadata.measurementSerial || "-"}. ` +
      `Måleren er egenkalibrert før og etter målingene med kalibrator ${state.metadata.calibratorModel || "-"}, ` +
      `Serial No: ${state.metadata.calibratorSerial || "-"}. Siste laboratoriekontroll og kalibrering på utstyret er ` +
      `${state.metadata.lastCalibrationDate || "-"}.`
  );

  if (state.metadata.methodText?.trim()) {
    renderParagraph(state.metadata.methodText.trim());
  }

  const tableBody = state.measurements.map((m) => [
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
  renderHeading("Funn og vurderinger");
  doc.setFontSize(12);
  doc.text("Måling av støy", 14, finalY);
  finalY += 6;
  renderParagraph(
    "Måleresultatene er gitt i tabell 2. LAeq (dB) er brukt i resultatene fordi støyen er kontinuerlig over tid, og LAeq‑verdiene gir dermed en god indikasjon på 8‑timers eksponering."
  );
  renderParagraph(
    `Lydnivå over grenseverdien (LAeq > ${state.thresholds.lex8h.red} dB(A) eller LPeak > ${state.thresholds.peak.red} dB(C)) vises med rødt. ` +
      `Lydnivå over nedre tiltaksverdi (LAeq > ${state.thresholds.lex8h.orange} dB(A)) vises med oransje. ` +
      `Lydnivå over anbefalt nivå (LAeq > ${state.thresholds.lex8h.yellow} dB(A) eller LPeak > ${state.thresholds.peak.yellow} dB(C)) vises med gult.`
  );

  const resultBody = state.measurements.map((m) => [
    m.location,
    m.duration,
    m.lex8h !== "" ? `${m.lex8h} dB` : "-",
    m.maxPeak !== "" ? `${m.maxPeak} dB` : "-",
    m.comment,
  ]);

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Målested", "Varighet", "LAeq (dB)", "LPeak (dB)", "Kommentar"]],
    body: resultBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: TEAL },
    didParseCell: (data) => {
      if (data.section === "body") {
        const rawRow = state.measurements[data.row.index];
        const lex = Number(rawRow.lex8h);
        const peak = Number(rawRow.maxPeak);
        const { thresholds } = state;

        if (lex > thresholds.lex8h.red || peak > thresholds.peak.red) {
          data.cell.styles.fillColor = [255, 200, 200];
        } else if (lex > thresholds.lex8h.orange) {
          data.cell.styles.fillColor = [255, 230, 200];
        } else if (lex > thresholds.lex8h.yellow || peak > thresholds.peak.yellow) {
          data.cell.styles.fillColor = [255, 255, 200];
        }
      }
    },
  });
  finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- Conclusions per Measurement ---
  renderHeading("Vurderinger, risikovurdering og konklusjon");
  renderParagraph(
    "Generelt viste målingene at det ikke er fare for impulsstøy over 130 dB(C). Videre følger en kort vurdering per målepunkt."
  );
  state.measurements.forEach((m) => {
    const lex = Number(m.lex8h);
    const peak = Number(m.maxPeak);
    const parts: string[] = [];
    if (Number.isFinite(lex)) {
      if (lex > state.thresholds.lex8h.red) {
        parts.push(`LAeq (${lex} dB) overstiger øvre tiltaksverdi.`);
      } else if (lex > state.thresholds.lex8h.orange) {
        parts.push(`LAeq (${lex} dB) overstiger nedre tiltaksverdi for støyende arbeid.`);
      } else if (lex > state.thresholds.lex8h.yellow) {
        parts.push(`LAeq (${lex} dB) ligger over anbefalt nivå.`);
      } else {
        parts.push(`LAeq (${lex} dB) ligger under anbefalte nivåer.`);
      }
    }
    if (Number.isFinite(peak)) {
      if (peak > state.thresholds.peak.red) {
        parts.push(`Peak‑nivå (${peak} dB(C)) overstiger grenseverdi.`);
      } else if (peak > state.thresholds.peak.yellow) {
        parts.push(`Peak‑nivå (${peak} dB(C)) ligger over anbefalt nivå.`);
      }
    }
    const paragraph =
      `${m.location}: ${parts.join(" ")} ${m.comment ? `Kommentar: ${m.comment}.` : ""}`.trim();
    renderParagraph(paragraph);
  });

  // --- Recommendations ---
  renderHeading("Anbefalinger");
  renderBullets(buildRecommendations(state));

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

  // --- Appendices ---
  renderHeading("Vedlegg");
  if (state.files.length === 0) {
    renderParagraph("Ingen vedlegg er lagt til.");
  } else {
    renderBullets(state.files.map((file, index) => `Vedlegg ${index + 1} – ${file.name}`));
  }

  return doc;
}

export function generateNoiseReportPDFBlob(state: ReportState) {
  const doc = createNoiseReportPDFDoc(state);
  return doc.output("blob");
}

export function generateNoiseReportPDF(state: ReportState) {
  const doc = createNoiseReportPDFDoc(state);
  doc.save(`Stoyrapport_${state.client.name.replace(/\s+/g, "_")}.pdf`);
}

function buildSummaryFromMeasurements(state: ReportState) {
  const { measurements, thresholds, client } = state;

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
    `Stasjonære støymålinger ble gjennomført på relevante arbeidsplasser i virksomheten. ` +
    `Støymålingene ble utført med stasjonær som var egenkalibrert før og etter målingene. ` +
    `Formålet var å vurdere de ansattes eksponering for støy.`;

  const rangeText =
    lexMin !== null && lexMax !== null
      ? `I hovedsak lå målingene i et område fra ${lexMin} dB(A) til ${lexMax} dB(A).`
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
      : `Måleresultatene viste at ingen målinger oversteg anbefalte nivåer.`;

  const peakText =
    peakMax !== null
      ? `Høyeste registrerte peak‑nivå var ${peakMax} dB(C).`
      : `Peak‑nivåer ble ikke registrert.`;

  const recommendationText =
    overRed > 0 || overOrange > 0 || overYellow > 0
      ? `BHT anbefaler å vurdere tiltak i områdene med høyest støynivå, samt jevnlig vedlikehold av maskiner og utstyr.`
      : `Støynivået fremstår akseptabelt, men BHT anbefaler jevnlig vedlikehold av maskiner og sørge for at alt utstyr er i god stand.`;

  return `${intro}\n${exceedanceText} ${rangeText} ${peakText}\n${recommendationText}`;
}

function buildRecommendations(state: ReportState) {
  const hasRed =
    state.measurements.some((m) => Number(m.lex8h) > state.thresholds.lex8h.red) ||
    state.measurements.some((m) => Number(m.maxPeak) > state.thresholds.peak.red);
  const hasOrange = state.measurements.some((m) => Number(m.lex8h) > state.thresholds.lex8h.orange);
  const hasYellow =
    state.measurements.some((m) => Number(m.lex8h) > state.thresholds.lex8h.yellow) ||
    state.measurements.some((m) => Number(m.maxPeak) > state.thresholds.peak.yellow);

  const items: string[] = [];
  if (hasRed || hasOrange || hasYellow) {
    items.push("Vurder tiltak i områder med forhøyede støynivåer.");
    items.push("Sørg for jevnlig vedlikehold av maskiner og utstyr.");
    items.push("Vurder organisatoriske tiltak som redusert eksponeringstid og rotering.");
    if (hasRed) {
      items.push("Vurder hørselsvern og merk områder med høy støy.");
    }
  } else {
    items.push("Støynivået vurderes som akseptabelt ut fra de registrerte målingene.");
    items.push("Fortsett med jevnlig vedlikehold av maskiner og sørg for at utstyr er i god stand.");
  }
  items.push("Bedriftshelsetjenesten deltar gjerne i det videre arbeidet med tiltak.");
  return items;
}
