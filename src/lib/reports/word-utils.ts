import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
} from "docx";

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

export function sanitizeFileNameSegment(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "");
  return normalized || fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createWordDocument(children: FileChild[]): Document {
  return new Document({
    sections: [{ children }],
  });
}

export async function packWordDocumentToBlob(document: Document): Promise<Blob> {
  return await Packer.toBlob(document);
}

export function createTitle(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
  });
}

export function createHeading(text: string, level: HeadingLevelValue = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
}

export function createBodyParagraph(text: string): Paragraph {
  return new Paragraph({
    text,
    spacing: { after: 120 },
  });
}

export function createParagraphsFromText(text: string): Paragraph[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(createBodyParagraph);
}

export function createBulletList(items: string[]): Paragraph[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map(
      (item) =>
        new Paragraph({
          text: item,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
    );
}

export function createTable(
  rows: string[][],
  options?: {
    header?: string[];
    firstColumnBold?: boolean;
  }
): Table {
  const tableRows: TableRow[] = [];

  if (options?.header?.length) {
    tableRows.push(
      new TableRow({
        children: options.header.map(
          (cell) =>
            new TableCell({
              shading: { fill: "E5E7EB" },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell || "-", bold: true })],
                }),
              ],
            })
        ),
      })
    );
  }

  tableRows.push(
    ...rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell, index) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell || "-",
                        bold: Boolean(options?.firstColumnBold && index === 0),
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
    )
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    },
    rows: tableRows,
  });
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(base64, "base64"));
}

export function createImageParagraphs(imageDataUrl: string | null, caption?: string): Paragraph[] {
  if (!imageDataUrl?.trim()) return [];

  const match = /^data:(image\/(png|jpeg|jpg|gif|bmp));base64,(.+)$/i.exec(imageDataUrl.trim());
  if (!match) {
    return [createBodyParagraph("Kunne ikke legge inn bilde i Word-dokumentet.")];
  }

  const imageType = match[2].toLowerCase() === "jpeg" ? "jpg" : match[2].toLowerCase();

  const paragraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new ImageRun({
          type: imageType as "jpg" | "png" | "gif" | "bmp",
          data: decodeBase64(match[3]),
          transformation: { width: 480, height: 300 },
        }),
      ],
    }),
  ];

  if (caption?.trim()) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: caption.trim(), italics: true })],
      })
    );
  }

  return paragraphs;
}
