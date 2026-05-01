import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listDraftsForUser } from "@/lib/report-drafts";
import { getSessionIdentity } from "@/lib/session-identity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

      {drafts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ingen lagrede rapporter</CardTitle>
            <CardDescription>Lag et utkast fra rapportverktøyet for å få det opp her.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{draft.assignment || "Uten oppdragsnavn"}</CardTitle>
                  <CardDescription>
                    {draft.clientName || "Uten kunde"}
                    {draft.clientOrgNr ? ` · Org.nr ${draft.clientOrgNr}` : ""}
                  </CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/reports/${draft.id}`}>Åpne utkast</Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                <p>Rapporttype: {draft.reportType || "Ukjent"}</p>
                <p>Steg: {draft.currentStep}</p>
                <p>Status: {draft.status}</p>
                <p>Oppdatert: {new Date(draft.updatedAt).toLocaleString("nb-NO")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
