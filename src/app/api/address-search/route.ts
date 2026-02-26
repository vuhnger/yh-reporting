import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

interface KartverketAddress {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  kommunenavn?: string;
  kommunenummer?: string;
  representasjonspunkt?: {
    lat?: number;
    lon?: number;
  };
}

interface AddressSearchResponse {
  adresser?: KartverketAddress[];
}

interface AddressSuggestion {
  id: string;
  label: string;
  addressText: string;
  postnummer: string;
  poststed: string;
  municipality: string;
  lat: number | null;
  lon: number | null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSuggestion(row: KartverketAddress, index: number): AddressSuggestion | null {
  const addressText = (row.adressetekst || "").trim();
  if (!addressText) return null;

  const postnummer = (row.postnummer || "").trim();
  const poststed = (row.poststed || "").trim();
  const municipality = (row.kommunenavn || "").trim();
  const lat = toNumber(row.representasjonspunkt?.lat);
  const lon = toNumber(row.representasjonspunkt?.lon);

  const cityPart = [postnummer, poststed].filter(Boolean).join(" ");
  const detailsPart = [cityPart, municipality].filter(Boolean).join(", ");
  const label = detailsPart ? `${addressText}, ${detailsPart}` : addressText;

  return {
    id: `${addressText}-${postnummer}-${municipality}-${index}`,
    label,
    addressText,
    postnummer,
    poststed,
    municipality,
    lat,
    lon,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const kartverketUrl =
      `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}` +
      "&fuzzy=true&treffPerSide=10";

    const response = await fetch(kartverketUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        { error: body || "Kunne ikke hente adresser fra Kartverket." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as AddressSearchResponse;
    const rows = Array.isArray(payload.adresser) ? payload.adresser : [];
    const results = rows
      .map((row, index) => normalizeSuggestion(row, index))
      .filter((row): row is AddressSuggestion => row !== null);

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error("Address search API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunne ikke hente adressesok." },
      { status: 500 }
    );
  }
}
