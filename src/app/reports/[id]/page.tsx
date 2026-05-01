import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDraftForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";
import { HomePageContent } from "@/components/home/home-page-content";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDraftPage({ params }: PageProps) {
  const { id } = await params;
  const callbackUrl = encodeURIComponent(`/reports/${id}`);

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signin?callbackUrl=${callbackUrl}`);
  }

  const identity = getSessionIdentity(session);
  if (!identity) {
    redirect(`/auth/signin?callbackUrl=${callbackUrl}`);
  }
  const draft = await getDraftForUser(identity, id);
  if (!draft) {
    notFound();
  }

  return <HomePageContent initialState={draft.reportState} draftId={draft.id} />;
}
