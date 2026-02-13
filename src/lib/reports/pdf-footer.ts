import type jsPDF from "jspdf";

const STANDARD_FOOTER_TEXT =
  "Dr.Dropin BHT AS • Sørkedalsveien 8, 0369 Oslo • +47 22 12 02 92 • bedrift@drdropin.no • bedrift.drdropin.no";

export function addStandardFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const lines = doc.splitTextToSize(STANDARD_FOOTER_TEXT, pageWidth - 28);
    const lineHeight = 3.2;
    const footerBottomY = pageHeight - 4.5;
    const textStartY = footerBottomY - (lines.length - 1) * lineHeight;
    const ruleY = textStartY - 3.8;

    doc.setDrawColor(210);
    doc.line(14, ruleY, pageWidth - 14, ruleY);

    doc.setTextColor(80);
    doc.setFontSize(7.5);
    lines.forEach((line: string, index: number) => {
      doc.text(line, pageWidth / 2, textStartY + index * lineHeight, { align: "center" });
    });
  }
}
