import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { addAttachmentToDraft } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const identity = getSessionIdentity(session);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const attachment = await addAttachmentToDraft(identity, id, file);
  if (!attachment) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
