import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { AIFieldConfig } from "@/lib/reports/template-types";
import { noiseSystemInstruction, noiseAIFields } from "@/lib/reports/templates/noise/ai";
import {
  indoorClimateSystemInstruction,
  indoorClimateAIFields,
} from "@/lib/reports/templates/indoor-climate/ai";

// Server-side AI config lookup (avoids importing React components via template registry)
function getAIConfig(reportType: string): {
  systemInstruction: string;
  fields: Record<string, AIFieldConfig>;
} | null {
  switch (reportType) {
    case "noise":
      return { systemInstruction: noiseSystemInstruction, fields: noiseAIFields };
    case "indoor-climate":
      return { systemInstruction: indoorClimateSystemInstruction, fields: indoorClimateAIFields };
    default:
      return null;
  }
}

function buildPrompt(
  fieldConfig: AIFieldConfig,
  context: Record<string, unknown>
) {
  const lengthHint =
    fieldConfig.length ?? "Skriv utfyllende tekst (1–3 avsnitt). Ikke avslutt etter én setning.";
  const structureHint =
    fieldConfig.structure ?? "Sammenhengende tekst (ingen lister).";

  return `
OPPGAVE: Generer en utdypende fagtekst til feltet "${fieldConfig.label}" i en rapport.

KONTEKST:
Denne teksten skal være detaljert og profesjonell. Den skal fungere som en forklarende bro mellom de tekniske målingene og rapportens konklusjoner.

KRAV:
- SPRÅK: Profesjonell norsk bokmål.
- LENGDE: ${lengthHint}
- STRUKTUR: ${structureHint}
- IKKE overskrifter eller punktlister.
- IKKE antagelser om bransje/arbeidssted utover data.
- DATA: Bruk spesifikke verdier og målepunkter fra JSON-dataene.

FELTETS FORMÅL:
${fieldConfig.purpose}

VEILEDNING:
${fieldConfig.guidance}

Hvis datagrunnlaget er tynt, utdyp teksten ved å forklare de generelle helsemessige eller sikkerhetsmessige betydningene.

DATA (JSON):
${JSON.stringify(context, null, 2)}
`.trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { reportType, field, context } = await req.json();

    const aiConfig = getAIConfig(reportType);
    if (!aiConfig) {
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    const fieldConfig = aiConfig.fields[field];
    if (!fieldConfig) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    if (!context || Object.keys(context).length === 0) {
      return NextResponse.json({ error: "Empty context" }, { status: 400 });
    }

    const prompt = buildPrompt(fieldConfig, context ?? {});

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: aiConfig.systemInstruction,
    });

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      {
        error: "Kunne ikke generere tekst.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
