import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportState } from "@/components/wizard/wizard-context";

export function generateNoiseReportPDF(state: ReportState) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Brand Colors (Approximate for PDF)
  const TEAL = "#005041";
  
  // --- Header ---
  doc.setFillColor(TEAL);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(24);
  doc.text("Rapport etter kartlegging av støy", 14, 25);
  
  doc.setFontSize(10);
  doc.text("Dr. Dropin Bedrift", pageWidth - 40, 15);
  doc.text("Støyrapport", pageWidth - 40, 20);

  // --- Client Info Table ---
  doc.setTextColor("#000000");
  doc.setFontSize(12);
  
  const clientData = [
    ["Bedrift og avdeling", state.client.name],
    ["Organisasjonsnummer", state.client.orgNr],
    ["Adresse", state.client.address],
    ["Oppdrag", state.metadata.assignment || "Støykartlegging"],
    ["Dato for utførelse", state.metadata.date],
    ["Deltakere", state.metadata.participants],
    ["Rapport skrevet av", state.metadata.author],
  ];

  autoTable(doc, {
    startY: 50,
    head: [],
    body: clientData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 60 } },
  });

  // --- Summary (Mock Text for now) ---
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text("Sammendrag", 14, finalY);
  
  doc.setFontSize(10);
  const summaryText = `Dr.Dropin BHT har bistått ${state.client.name} med kartlegging av eksponering for støy. Formålet var å vurdere de ansattes eksponering for støy i henhold til gjeldende regelverk.`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
  doc.text(splitSummary, 14, finalY + 7);

  // --- Measurements Table ---
  finalY += 30;
  doc.setFontSize(14);
  doc.text("Måleresultater (Tabell 2)", 14, finalY);

  const tableBody = state.measurements.map(m => {
    // Determine Color
    // Note: jsPDF autotable supports styling cells via the 'didParseCell' hook
    return [
      m.location,
      m.duration,
      m.lex8h ? `${m.lex8h} dB` : "-",
      m.maxPeak ? `${m.maxPeak} dB` : "-",
      m.comment
    ];
  });

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Målested', 'Varighet', 'LAeq (dB)', 'LPeak (dB)', 'Kommentar']],
    body: tableBody,
    styles: { fontSize: 10 },
    headStyles: { fillColor: TEAL },
    didParseCell: (data) => {
      // Logic for background color based on values
      if (data.section === 'body') {
        const rawRow = state.measurements[data.row.index];
        const lex = Number(rawRow.lex8h);
        const peak = Number(rawRow.maxPeak);
        const { thresholds } = state;

        if ((lex > thresholds.lex8h.red) || (peak > thresholds.peak.red)) {
             data.cell.styles.fillColor = [255, 200, 200]; // Light Red
        } else if (lex > thresholds.lex8h.orange) {
             data.cell.styles.fillColor = [255, 230, 200]; // Light Orange
        } else if ((lex > thresholds.lex8h.yellow) || (peak > thresholds.peak.yellow)) {
             data.cell.styles.fillColor = [255, 255, 200]; // Light Yellow
        }
      }
    }
  });

  // Save
  doc.save(`Stoyrapport_${state.client.name.replace(/\s+/g, '_')}.pdf`);
}
