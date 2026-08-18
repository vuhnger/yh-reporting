/**
 * Text helpers for Norwegian content (æ, ø, å).
 *
 * Two problems this solves:
 *
 * 1. Decomposed Unicode (NFD). Text pasted from macOS file names and some
 *    external systems encodes "å" as "a" + a combining ring instead of a single
 *    code point. jsPDF's built-in fonts only cover single-byte WinAnsi, so one
 *    combining mark silently switches the whole string to UTF-16 and the text
 *    renders as garbage in the PDF. Precomposed (NFC) letters render fine.
 * 2. File names. Download names keep æøå, while storage keys and HTTP headers
 *    need ASCII. Either way, stripping the letters outright turns "Støymåling"
 *    into "Stymling", so transliterate instead.
 */

// Invisible code points that survive copy/paste and break word wrapping, string
// comparisons and PDF text runs: ZWSP, ZWNJ, ZWJ, word joiner, BOM, soft hyphen.
const INVISIBLE_CODE_POINTS = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad]);

// Matches the established ASCII spelling of Norwegian names ("Støy" -> "Stoy").
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/æ/g, "ae"],
  [/Æ/g, "Ae"],
  [/ø/g, "o"],
  [/Ø/g, "O"],
  [/å/g, "a"],
  [/Å/g, "A"],
];

// Reserved on Windows and/or POSIX file systems.
const RESERVED_FILE_NAME_CHARS = new Set(["/", "\\", ":", "*", "?", '"', "<", ">", "|"]);

function stripUnsafeFileNameChars(value: string): string {
  let result = "";
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    const isControl = codePoint < 0x20 || codePoint === 0x7f;
    result += isControl || RESERVED_FILE_NAME_CHARS.has(char) ? "-" : char;
  }
  return result;
}

function hasNonAscii(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 0x7f) return true;
  }
  return false;
}

function stripInvisible(value: string): string {
  let result = "";
  for (const char of value) {
    if (!INVISIBLE_CODE_POINTS.has(char.codePointAt(0) ?? 0)) result += char;
  }
  return result;
}

/** Normalize text to precomposed (NFC) form and drop invisible characters. */
export function normalizeNorwegian(value: string): string {
  if (!hasNonAscii(value)) return value;
  return stripInvisible(value.normalize("NFC"));
}

/**
 * Apply {@link normalizeNorwegian} to every string in a JSON-like structure.
 * Non-plain objects (Date, Blob, File, ...) are passed through untouched.
 */
export function normalizeNorwegianDeep<T>(value: T): T {
  if (typeof value === "string") return normalizeNorwegian(value) as T;
  if (Array.isArray(value)) return value.map(normalizeNorwegianDeep) as T;

  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = normalizeNorwegianDeep(item);
    }
    return result as T;
  }

  return value;
}

/**
 * Build a download file name that keeps the Norwegian letters but drops
 * characters that are reserved by file systems:
 * "Støymåling: på/av" -> "Støymåling_på-av".
 */
export function toSafeFileNameSegment(value: string, fallback: string): string {
  const safe = stripUnsafeFileNameChars(normalizeNorwegian(value).trim().replace(/\s+/g, "_"))
    .replace(/-{2,}/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return safe || fallback;
}

/**
 * Transliterate Norwegian letters to ASCII for places that must stay ASCII,
 * such as cloud storage object keys and HTTP headers:
 * "Støymåling på møterom" -> "Stoymaling_pa_moterom".
 */
export function toAsciiFileName(value: string, fallback: string): string {
  let ascii = normalizeNorwegian(value).trim();

  for (const [pattern, replacement] of TRANSLITERATIONS) {
    ascii = ascii.replace(pattern, replacement);
  }

  // Decompose the rest (e-acute -> e + mark) so accents are dropped instead of
  // the letter itself.
  ascii = ascii
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return ascii || fallback;
}
