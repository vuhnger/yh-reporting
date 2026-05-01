import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createDraftForUser, listDraftsForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";
import type { ReportState } from "@/lib/reports/template-types";

export async function GET() {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const drafts = await listDraftsForUser(identity);
    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("listDraftsForUser failed:", err);
    return NextResponse.json(
      { error: "Storage error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const raw = await req.json();
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    payload = raw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof payload.state !== "object" || payload.state === null) {
    return NextResponse.json({ error: "Missing report state" }, { status: 400 });
  }

  try {
    const draft = await createDraftForUser(identity, payload.state as ReportState);
    return NextResponse.json({ draft }, { status: 201 });
  } catch (err) {
    console.error("createDraftForUser failed:", err);
    return NextResponse.json(
      { error: "Storage error", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
