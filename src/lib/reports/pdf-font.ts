import type jsPDF from "jspdf";

type GraphikFontPayload = {
  regular: string;
  medium: string;
};

let cachedGraphikFonts: GraphikFontPayload | null | undefined;

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

function loadFontBase64Sync(url: string): string | null {
  if (typeof XMLHttpRequest === "undefined") return null;

  try {
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.responseType = "arraybuffer";
    request.send();

    if (request.status < 200 || request.status >= 300) return null;
    if (!(request.response instanceof ArrayBuffer)) return null;
    return arrayBufferToBase64(request.response);
  } catch {
    return null;
  }
}

function getGraphikFonts(): GraphikFontPayload | null {
  if (cachedGraphikFonts !== undefined) return cachedGraphikFonts;
  if (typeof window === "undefined") {
    cachedGraphikFonts = null;
    return cachedGraphikFonts;
  }

  const regular = loadFontBase64Sync("/fonts/Graphik-Regular.otf");
  const medium = loadFontBase64Sync("/fonts/Graphik-Medium.otf");

  if (!regular || !medium) {
    cachedGraphikFonts = null;
    return cachedGraphikFonts;
  }

  cachedGraphikFonts = { regular, medium };
  return cachedGraphikFonts;
}

export function applyGraphikPdfFont(doc: jsPDF): boolean {
  const fonts = getGraphikFonts();
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
