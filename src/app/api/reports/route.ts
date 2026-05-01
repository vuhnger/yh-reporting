import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createDraftForUser, listDraftsForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";

export async function GET() {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drafts = await listDraftsForUser(identity);
  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  if (!payload?.state) {
    return NextResponse.json({ error: "Missing report state" }, { status: 400 });
  }

  const draft = await createDraftForUser(identity, payload.state);
  return NextResponse.json({ draft }, { status: 201 });
}
