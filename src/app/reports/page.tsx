import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listDraftsForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";
import { Button } from "@/components/ui/button";
import { SavedReportsList } from "@/components/reports/saved-reports-list";

export default async function SavedReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin?callbackUrl=%2Freports");
  }

  const identity = getSessionIdentity(session);
  if (!identity) {
    redirect("/auth/signin?callbackUrl=%2Freports");
  }

  const drafts = await listDraftsForUser(identity);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Lagrede rapporter</h1>
          <p className="text-muted-foreground">Fortsett på utkastene dine eller start en ny rapport.</p>
        </div>
        <Button asChild>
          <Link href="/">Ny rapport</Link>
        </Button>
      </div>

      <SavedReportsList initialDrafts={drafts} />
    </div>
  );
}
