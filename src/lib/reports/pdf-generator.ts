import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportState } from "@/components/wizard/wizard-context";

export function generateNoiseReportPDF(state: ReportState) {
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
  if (state.reportType === "noise") {
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
      "Det er fastsatt tiltaks- og grenseverdier for støy. Tiltaksverdier krever at arbeidsgiver vurderer og gjennomfører tiltak, mens grenseverdier ikke skal overskrides."
    );
    renderParagraph(
      "Dersom grenseverdiene overskrides, skal arbeidsgiver iverksette strakstiltak. Hvis tiltaksverdier overskrides, skal det utarbeides en skriftlig tiltaksplan og vurderes hørselsvern."
    );

    doc.setFontSize(12);
    doc.text("Informasjon og opplæring", 14, finalY);
    finalY += 6;
    renderParagraph(
      "Arbeidstakere og verneombud skal ha løpende informasjon og opplæring om risiko dersom støyeksponeringen er lik eller overstiger LEX,8h ≥ 80 dB(A) eller LpC,peak ≥ 130 dB(C)."
    );
  }

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
    m.lex8h !== "" ? String(m.lex8h) : "-",
    m.maxPeak !== "" ? String(m.maxPeak) : "-",
    m.comment || "",
  ]);

  ensureSpace(60);
  autoTable(doc, {
    startY: finalY + 4,
    head: [["Sted", "Måling 1", "Måling 2", "Kommentar"]],
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

  // Save
  doc.save(`Stoyrapport_${state.client.name.replace(/\s+/g, '_')}.pdf`);
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
    `Stasjonære støymålinger ble gjennomført på arbeidsstasjoner i laboratoriet med støyende maskiner. ` +
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
