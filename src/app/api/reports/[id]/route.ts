import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteDraftForUser, getDraftForUser, setDraftStatusForUser, updateDraftForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";

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
  const payload = await req.json();

  if (payload?.status) {
    if (payload.status !== "draft" && payload.status !== "archived") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const draft = await setDraftStatusForUser(identity, id, payload.status);
    if (!draft) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ draft });
  }

  if (!payload?.state) {
    return NextResponse.json({ error: "Missing report state" }, { status: 400 });
  }

  const draft = await updateDraftForUser(identity, id, payload.state);
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
