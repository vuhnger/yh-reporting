import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

type AllowedField =
  | "summaryText"
  | "introExtraText"
  | "thresholdsExtraText"
  | "riskExtraText"
  | "trainingExtraText"
  | "methodText"
  | "findingsText"
  | "conclusionsExtraText"
  | "recommendationsExtraText"
  | "referencesExtraText"
  | "appendicesExtraText";

const FIELD_LABELS: Record<AllowedField, string> = {
  summaryText: "Sammendrag (ekstra tekst)",
  introExtraText: "Innledning – Støy og helseeffekter (ekstra tekst)",
  thresholdsExtraText: "Grenseverdier og tiltaksverdier (ekstra tekst)",
  riskExtraText: "Risikovurdering og tiltak (ekstra tekst)",
  trainingExtraText: "Informasjon og opplæring (ekstra tekst)",
  methodText: "Gjennomføring og metode (ekstra tekst)",
  findingsText: "Funn og vurderinger (ekstra tekst)",
  conclusionsExtraText: "Vurderinger, risikovurdering og konklusjon (ekstra tekst)",
  recommendationsExtraText: "Anbefalinger (ekstra tekst)",
  referencesExtraText: "Referanser (ekstra tekst)",
  appendicesExtraText: "Vedlegg (ekstra tekst)",
};

function buildPrompt(field: AllowedField, context: Record<string, unknown>) {
  const fieldPurpose: Record<AllowedField, string> = {
    summaryText: "Dette feltet skal utdype sammendraget med relevant, nøytral vurdering.",
    introExtraText: "Dette feltet skal gi ekstra faglig kontekst i innledningen.",
    thresholdsExtraText: "Dette feltet skal utdype forståelsen av tiltaks- og grenseverdier.",
    riskExtraText: "Dette feltet skal beskrive risikovurdering/tiltak generelt.",
    trainingExtraText: "Dette feltet skal begrunne behov for informasjon og opplæring.",
    methodText: "Dette feltet skal beskrive gjennomføring/metode på et overordnet nivå.",
    findingsText: "Dette feltet skal introdusere måleresultatene før tabellen.",
    conclusionsExtraText: "Dette feltet skal gi en samlet vurdering før per‑måling avsnitt.",
    recommendationsExtraText:
      "Dette feltet skal være medarbeiderens konkrete anbefalinger/tiltak (formulert som forslag). Unngå vage formuleringer.",
    referencesExtraText: "Dette feltet skal forklare at referansene er relevante kilder.",
    appendicesExtraText: "Dette feltet skal forklare hva vedleggene dokumenterer.",
  };
  const fieldGuidance: Record<AllowedField, string> = {
    summaryText:
      "Skriv 2–3 avsnitt som utdyper sammendraget med måleresultater (intervall, høyeste peak, ev. overskridelser) og vurdering. Ikke gjenta standardtekst ordrett.",
    introExtraText:
      "Skriv 1–2 avsnitt som gir nøytral faglig kontekst, uten å anta arbeidsstedstype.",
    thresholdsExtraText:
      "Skriv 1–2 avsnitt som forklarer hvordan tiltaksverdier brukes i vurdering, uten å gjenta standardtekst.",
    riskExtraText:
      "Skriv 1–2 avsnitt som utdyper risikovurdering/tiltak generisk, uten å anta spesifikke forhold.",
    trainingExtraText:
      "Skriv 2–3 avsnitt som forklarer hvorfor informasjon/opplæring er viktig, og hvordan dette bidrar til etterlevelse og risikoreduksjon. Ikke anta spesifikk bransje.",
    methodText:
      "Skriv 1–2 avsnitt om gjennomføring basert på instrumentdata og antall målinger. Ikke oppfinn detaljer.",
    findingsText:
      "Skriv 2–3 avsnitt som introduksjon til tabellen. Nevn variasjon mellom målepunkter og evt. overskridelser basert på tallene.",
    conclusionsExtraText:
      "Skriv 2–3 avsnitt som binder målingene sammen. Referer til målepunkter og nivåer (LAeq/LPeak) og pek på hovedmønster.",
    recommendationsExtraText:
      "Skriv 1–2 avsnitt med konkrete tiltak/forbedringer basert på måledata (f.eks. vedlikehold, skjerming, avstand, organisatoriske tiltak). Unngå vage formuleringer som «bør vurderes». Ikke kall det impulsstøy med mindre LPeak > 130 dB(C). Knytt tiltak til faktiske målepunkter/kommentarer.",
    referencesExtraText:
      "Skriv 1 avsnitt som forklarer at referansene er relevante regelverk og veiledning.",
    appendicesExtraText:
      "Skriv 1 avsnitt om at vedlegg dokumenterer målingene og evt. detaljer.",
  };

  return `
OPPGAVE: Generer en utdypende fagtekst til feltet "${FIELD_LABELS[field]}" i en støyrapport.

KONTEKST:
Denne teksten skal være detaljert og profesjonell. Den skal fungere som en forklarende bro mellom de tekniske målingene og rapportens konklusjoner.

KRAV:
- SPRÅK: Profesjonell norsk bokmål.
- LENGDE: Skriv utfyllende tekst (1–3 avsnitt). Ikke avslutt etter én setning.
- STRUKTUR: Sammenhengende tekst (ingen lister).
- IKKE overskrifter eller punktlister.
- IKKE antagelser om bransje/arbeidssted utover data.
- DATA: Bruk spesifikke verdier og målepunkter fra JSON-dataene.

FELTETS FORMÅL:
${fieldPurpose[field]}

VEILEDNING:
${fieldGuidance[field]}

Hvis datagrunnlaget er tynt, utdyp teksten ved å forklare de generelle helsemessige eller sikkerhetsmessige betydningene av denne typen støynivå.

DATA (JSON):
${JSON.stringify(context, null, 2)}
`.trim();
}

export async function POST(req: Request) {
  try {
    const { field, context } = await req.json();
    if (!field || !(field in FIELD_LABELS)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    if (!context || Object.keys(context).length === 0) {
      return NextResponse.json({ error: "Empty context" }, { status: 400 });
    }

    const prompt = buildPrompt(field as AllowedField, context ?? {});

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        "Du er en teknisk skribent som er ekspert på akustikk og HMS. Du skriver utfyllende, forklarende og detaljerte tekster basert på måledata. Språket er formelt og saklig.",
    });
    const generate = async (p: string, overrideModel?: string) => {
      const activeModel = overrideModel
        ? genAI.getGenerativeModel({
            model: overrideModel,
            systemInstruction:
              "Du er en teknisk skribent som er ekspert på akustikk og HMS. Du skriver utfyllende, forklarende og detaljerte tekster basert på måledata. Språket er formelt og saklig.",
          })
        : model;
      return activeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: p }] }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.8,
        },
      });
    };

    const result = await generate(prompt);
    const response = result.response;
    const finishReason = response.candidates?.[0]?.finishReason;

    console.log("Finish Reason:", finishReason);

    if (finishReason === "SAFETY") {
      return NextResponse.json({ error: "Blocked by safety filters" }, { status: 400 });
    }

    let responseText = response.text().trim();
    console.log("FINAL TEXT LENGTH:", responseText.length);

    if (!responseText) {
      return NextResponse.json(
        {
          error: "Empty response",
          finishReason: response.candidates?.[0]?.finishReason ?? null,
          safetyRatings: response.candidates?.[0]?.safetyRatings ?? null,
          raw: response,
        },
        { status: 502 }
      );
    }

    if (responseText.length < 250) {
      const expandPrompt = `${prompt}

EKSTRA INSTRUKS:
- Teksten er for kort. Utvid med flere setninger og minst to avsnitt.
- Ikke gjenta første setning ordrett.

DRAFT:
${responseText}`;
      const expanded = await generate(expandPrompt);
      let expandedText = expanded.response.text().trim();

      if (expandedText.length < 250 && modelName === "gemini-3-flash-preview") {
        const fallback = await generate(expandPrompt, "gemini-2.5-flash");
        expandedText = fallback.response.text().trim();
      }

      if (expandedText.length >= 250) {
        responseText = expandedText;
      }
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Kunne ikke generere tekst.", details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
