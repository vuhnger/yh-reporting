import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { removeAttachmentFromDraft } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await context.params;
  const removed = await removeAttachmentFromDraft(identity, id, attachmentId);
  if (!removed) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
