import type jsPDF from "jspdf";

type GraphikFontPayload = {
  regular: string;
  medium: string;
};

const ENABLE_GRAPHIK_PDF_FONT = process.env.NEXT_PUBLIC_ENABLE_GRAPHIK_PDF_FONT === "1";

let cachedGraphikFonts: GraphikFontPayload | null | undefined;
let graphikFontsPromise: Promise<GraphikFontPayload | null> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadFontBase64(url: string): Promise<string | null> {
  if (typeof fetch === "undefined") return null;

  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return arrayBufferToBase64(buffer);
  } catch {
    return null;
  }
}

async function getGraphikFonts(): Promise<GraphikFontPayload | null> {
  if (cachedGraphikFonts !== undefined) return cachedGraphikFonts;
  if (typeof window === "undefined") {
    cachedGraphikFonts = null;
    return cachedGraphikFonts;
  }

  if (!graphikFontsPromise) {
    graphikFontsPromise = (async () => {
      const [regular, medium] = await Promise.all([
        loadFontBase64("/fonts/Graphik-Regular.otf"),
        loadFontBase64("/fonts/Graphik-Medium.otf"),
      ]);

      if (!regular || !medium) {
        cachedGraphikFonts = null;
        return cachedGraphikFonts;
      }

      cachedGraphikFonts = { regular, medium };
      return cachedGraphikFonts;
    })();
  }

  try {
    return await graphikFontsPromise;
  } finally {
    graphikFontsPromise = null;
  }
}

export async function applyGraphikPdfFont(doc: jsPDF): Promise<boolean> {
  // jsPDF + OTF Graphik has been unstable in-browser and can corrupt output/build state.
  // Keep built-in font as default unless explicitly enabled.
  if (!ENABLE_GRAPHIK_PDF_FONT) return false;

  const fonts = await getGraphikFonts();
  if (!fonts) return false;

  try {
    doc.addFileToVFS("Graphik-Regular.otf", fonts.regular);
    doc.addFileToVFS("Graphik-Medium.otf", fonts.medium);
    doc.addFont("Graphik-Regular.otf", "Graphik", "normal");
    doc.addFont("Graphik-Medium.otf", "Graphik", "bold");
    doc.setFont("Graphik", "normal");
    return true;
  } catch {
    return false;
  }
}
