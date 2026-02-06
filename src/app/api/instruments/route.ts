import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  sheetsConfig,
  getSheetsClient,
  resolveGidToSheetName,
} from "@/lib/google-sheets";

export interface Instrument {
  hva: string;
  modell: string;
  produsent: string;
  leverandor: string;
  serienr: string;
  sistKalibrert: string | null;
  nesteKalibrering: string | null;
  malerNummer: string;
  maleutstyrssett: string;
  kalibreringssertifikat: string;
  programvare: string;
  bruksanvisning: string;
  kommentar: string;
}

// In-memory cache
let cache: { data: Instrument[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function parseDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Try DD.MM.YYYY (Norwegian format)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Try DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

async function fetchInstruments(): Promise<Instrument[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const client = getSheetsClient();
  const sheetName = await resolveGidToSheetName(sheetsConfig.gid);
  if (!sheetName) throw new Error("Could not resolve sheet tab name");

  const res = await client.spreadsheets.values.get({
    spreadsheetId: sheetsConfig.sheetsId,
    range: `${sheetName}`,
  });

  const rows = res.data.values ?? [];

  // Find the header row (contains "Hva")
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((cell: string) => cell.trim().toLowerCase() === "hva")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error("Header row not found in sheet");

  const headers = rows[headerIdx].map((h: string) =>
    h.trim().toLowerCase().replace(/[.:]/g, "")
  );

  const col = (name: string) => {
    const idx = headers.indexOf(name);
    return idx;
  };

  const instruments: Instrument[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const hva = row[col("hva")]?.trim();
    if (!hva) continue; // Skip empty rows

    instruments.push({
      hva,
      modell: row[col("modell")]?.trim() ?? "",
      produsent: row[col("produsent")]?.trim() ?? "",
      leverandor: row[col("leverandør")] ?? row[col("leverandor")]?.trim() ?? "",
      serienr: row[col("serienr")]?.trim() ?? "",
      sistKalibrert: parseDate(row[col("sist kalibert")] ?? row[col("sist kalibrert")]),
      nesteKalibrering: parseDate(row[col("neste kalibrering")]),
      malerNummer: row[col("måler nummer")] ?? row[col("maler nummer")]?.trim() ?? "",
      maleutstyrssett: row[col("måleutstyrssett")] ?? row[col("maleutstyrssett")]?.trim() ?? "",
      kalibreringssertifikat: row[col("kalibreringssertifikat")]?.trim() ?? "",
      programvare: row[col("programvare")]?.trim() ?? "",
      bruksanvisning: row[col("bruksanvisning")]?.trim() ?? "",
      kommentar: row[col("kommentar")]?.trim() ?? "",
    });
  }

  cache = { data: instruments, ts: Date.now() };
  return instruments;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!sheetsConfig.isConfigured) {
      return NextResponse.json(
        { error: "Google Sheets not configured" },
        { status: 500 }
      );
    }

    const instruments = await fetchInstruments();
    const sheetUrl = sheetsConfig.gid
      ? `https://docs.google.com/spreadsheets/d/${sheetsConfig.sheetsId}/edit#gid=${sheetsConfig.gid}`
      : `https://docs.google.com/spreadsheets/d/${sheetsConfig.sheetsId}`;
    return NextResponse.json({ instruments, sheetUrl });
  } catch (error: unknown) {
    console.error("Instruments API error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente instrumentliste." },
      { status: 500 }
    );
  }
}
