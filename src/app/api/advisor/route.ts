import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { advisorConfig, resolveAdvisorByOrgNr } from "@/lib/advisor";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!advisorConfig.portalConfigured || !advisorConfig.makeplansConfigured) {
      return NextResponse.json(
        { error: "Advisor integrations are not configured." },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const orgNr = (url.searchParams.get("orgNr") || "").trim();
    const normalizedOrgNr = orgNr.replace(/\D/g, "");

    if (normalizedOrgNr.length !== 9) {
      return NextResponse.json({ error: "Ugyldig organisasjonsnummer." }, { status: 400 });
    }

    const advisor = await resolveAdvisorByOrgNr(orgNr);
    return NextResponse.json({ advisor });
  } catch (error: unknown) {
    console.error("Advisor API error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente rådgiver." },
      { status: 500 }
    );
  }
}
