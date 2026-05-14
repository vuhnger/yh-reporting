import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type FileChild,
} from "docx";

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];
type SupportedWordImageType = "jpg" | "png" | "gif" | "bmp";
interface ParsedWordImage {
  type: SupportedWordImageType;
  data: Uint8Array;
  width: number | null;
  height: number | null;
}

const BRAND_TEAL = "005041";
const BRAND_LIGHT_GRAY = "F0F0F0";
const BORDER_GRAY = "D2D2D2";
const SOFT_BORDER_GRAY = "E5E5E5";
const MUTED_TEXT = "4B5563";
const STANDARD_FOOTER_TEXT =
  "Dr.Dropin BHT AS | Sørkedalsveien 8, 0369 Oslo | +47 22 12 02 92 | bedrift@drdropin.no | bedrift.drdropin.no";

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
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 900,
              left: 720,
              header: 360,
              footer: 360,
              gutter: 0,
            },
          },
        },
        footers: {
          default: createStandardFooter(),
        },
        children,
      },
    ],
  });
}

export async function packWordDocumentToBlob(document: Document): Promise<Blob> {
  return await Packer.toBlob(document);
}

export function createTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: BRAND_TEAL,
        size: 30,
      }),
    ],
  });
}

export function createHeading(text: string, level: HeadingLevelValue = HeadingLevel.HEADING_1): Paragraph {
  const sizeByLevel: Record<HeadingLevelValue, number> = {
    [HeadingLevel.HEADING_1]: 28,
    [HeadingLevel.HEADING_2]: 24,
    [HeadingLevel.HEADING_3]: 22,
    [HeadingLevel.HEADING_4]: 22,
    [HeadingLevel.HEADING_5]: 22,
    [HeadingLevel.HEADING_6]: 22,
    [HeadingLevel.TITLE]: 30,
  };

  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: BRAND_TEAL,
        size: sizeByLevel[level],
      }),
    ],
  });
}

export function createBodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        size: 21,
      }),
    ],
  });
}

export function createSpacer(after = 160): Paragraph {
  return new Paragraph({ spacing: { after } });
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
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: item,
              size: 21,
            }),
          ],
        })
    );
}

export function createTable(
  rows: string[][],
  options?: {
    header?: string[];
    firstColumnBold?: boolean;
    headerFillColor?: string;
    headerTextColor?: string;
    firstColumnFillColor?: string;
  }
): Table {
  const tableRows: TableRow[] = [];

  if (options?.header?.length) {
    tableRows.push(
      new TableRow({
        children: options.header.map(
          (cell) =>
            new TableCell({
              shading: { fill: options.headerFillColor ?? BRAND_TEAL },
              margins: { top: 80, bottom: 80, left: 90, right: 90 },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell || "-",
                      bold: true,
                      color: options.headerTextColor ?? "FFFFFF",
                      size: 20,
                    }),
                  ],
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
                shading:
                  options?.firstColumnBold && index === 0
                    ? { fill: options.firstColumnFillColor ?? BRAND_LIGHT_GRAY }
                    : undefined,
                margins: { top: 80, bottom: 80, left: 90, right: 90 },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell || "-",
                        bold: Boolean(options?.firstColumnBold && index === 0),
                        size: 20,
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
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: SOFT_BORDER_GRAY },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: SOFT_BORDER_GRAY },
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

function readJpegSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 8 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    const segmentLength = (data[offset + 2] << 8) | data[offset + 3];
    if (segmentLength < 2 || offset + 2 + segmentLength > data.length) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      const height = (data[offset + 5] << 8) | data[offset + 6];
      const width = (data[offset + 7] << 8) | data[offset + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readImageSize(type: SupportedWordImageType, data: Uint8Array): { width: number; height: number } | null {
  if (type === "png") {
    if (data.length < 24) return null;
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (type === "gif") {
    if (data.length < 10) return null;
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (type === "bmp") {
    if (data.length < 26) return null;
    const width = data[18] | (data[19] << 8) | (data[20] << 16) | (data[21] << 24);
    const height = Math.abs(data[22] | (data[23] << 8) | (data[24] << 16) | (data[25] << 24));
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (type === "jpg") {
    return readJpegSize(data);
  }

  return null;
}

function fitImageWithinBox(
  width: number | null,
  height: number | null,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function parseImageDataUrl(imageDataUrl: string): ParsedWordImage | null {
  const match = /^data:(image\/(png|jpeg|jpg|gif|bmp));base64,(.+)$/i.exec(imageDataUrl.trim());
  if (!match) return null;

  const type = (match[2].toLowerCase() === "jpeg" ? "jpg" : match[2].toLowerCase()) as SupportedWordImageType;
  const data = decodeBase64(match[3]);
  const size = readImageSize(type, data);

  return {
    type,
    data,
    width: size?.width ?? null,
    height: size?.height ?? null,
  };
}

export function createImageRunFromDataUrl(
  imageDataUrl: string,
  maxWidth: number,
  maxHeight: number
): ImageRun | null {
  const image = parseImageDataUrl(imageDataUrl);
  if (!image) return null;
  const { width, height } = fitImageWithinBox(image.width, image.height, maxWidth, maxHeight);

  return new ImageRun({
    type: image.type,
    data: image.data,
    transformation: { width, height },
  });
}

export function createBrandedCover(title: string, logoDataUrl: string | null): Table {
  const logoRun = logoDataUrl ? createImageRunFromDataUrl(logoDataUrl, 42, 36) : null;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 74, type: WidthType.PERCENTAGE },
            shading: { fill: BRAND_TEAL },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 220, bottom: 220, left: 180, right: 120 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: title,
                    color: "FFFFFF",
                    bold: true,
                    size: 34,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 26, type: WidthType.PERCENTAGE },
            shading: { fill: BRAND_TEAL },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 220, bottom: 220, left: 120, right: 160 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: logoRun
                  ? [logoRun]
                  : [new TextRun({ text: "Dr. Dropin Bedrift", color: "FFFFFF", bold: true })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function createStandardFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY, space: 1 },
        },
        spacing: { before: 120 },
        children: [
          new TextRun({ text: STANDARD_FOOTER_TEXT, color: MUTED_TEXT, size: 14 }),
          new TextRun({ text: " | Side ", color: MUTED_TEXT, size: 14 }),
          new TextRun({ children: [PageNumber.CURRENT], color: MUTED_TEXT, size: 14 }),
        ],
      }),
    ],
  });
}

export function createImageParagraphs(imageDataUrl: string | null, caption?: string): Paragraph[] {
  if (!imageDataUrl?.trim()) return [];

  const image = parseImageDataUrl(imageDataUrl);
  if (!image) {
    return [createBodyParagraph("Kunne ikke legge inn bilde i Word-dokumentet.")];
  }

  const paragraphs = [
    (() => {
      const { width, height } = fitImageWithinBox(image.width, image.height, 480, 300);
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new ImageRun({
            type: image.type,
            data: image.data,
            transformation: { width, height },
          }),
        ],
      });
    })(),
  ];

  if (caption?.trim()) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: caption.trim(), italics: true, color: MUTED_TEXT, size: 18 })],
      })
    );
  }

  return paragraphs;
}
