import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteDraftForUser, getDraftForUser, setDraftStatusForUser, updateDraftForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";
import type { ReportState } from "@/lib/reports/template-types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const draft = await getDraftForUser(identity, id);
  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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

  if (payload.status !== undefined) {
    if (payload.status !== "draft" && payload.status !== "archived") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const draft = await setDraftStatusForUser(identity, id, payload.status as "draft" | "archived");
    if (!draft) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ draft });
  }

  if (typeof payload.state !== "object" || payload.state === null) {
    return NextResponse.json({ error: "Missing report state" }, { status: 400 });
  }

  const draft = await updateDraftForUser(identity, id, payload.state as ReportState);
  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteDraftForUser(identity, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
