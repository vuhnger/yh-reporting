"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import type { ReportDraftSummary } from "@/lib/report-drafts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SavedReportsList({ initialDrafts }: { initialDrafts: ReportDraftSummary[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { active, archived } = useMemo(
    () => ({
      active: drafts.filter((draft) => draft.status !== "archived"),
      archived: drafts.filter((draft) => draft.status === "archived"),
    }),
    [drafts]
  );

  async function setStatus(id: string, status: "draft" | "archived") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Kunne ikke oppdatere status.");

      setDrafts((prev) => prev.map((draft) => (draft.id === id ? payload.draft : draft)));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Kunne ikke oppdatere utkast.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(id: string) {
    if (!window.confirm("Slette dette utkastet permanent?")) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Kunne ikke slette utkast.");

      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Kunne ikke slette utkast.");
    } finally {
      setBusyId(null);
    }
  }

  function renderDrafts(items: ReportDraftSummary[], archivedList = false) {
    if (items.length === 0) return null;

    return (
      <div className="grid gap-4">
        {items.map((draft) => (
          <Card key={draft.id}>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{draft.assignment || "Uten oppdragsnavn"}</CardTitle>
                <CardDescription>
                  {draft.clientName || "Uten kunde"}
                  {draft.clientOrgNr ? ` · Org.nr ${draft.clientOrgNr}` : ""}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`/reports/${draft.id}`}>Åpne utkast</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => void setStatus(draft.id, archivedList ? "draft" : "archived")} disabled={busyId === draft.id}>
                  {busyId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
                  {archivedList ? "Gjenopprett" : "Arkiver"}
                </Button>
                <Button type="button" variant="destructive" onClick={() => void deleteDraft(draft.id)} disabled={busyId === draft.id}>
                  {busyId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Slett
                </Button>
              </div>
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
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">Aktive utkast</h2>
        {active.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Ingen aktive utkast</CardTitle>
              <CardDescription>Lag et utkast fra rapportverktøyet for å få det opp her.</CardDescription>
            </CardHeader>
          </Card>
        ) : renderDrafts(active)}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">Arkiverte utkast</h2>
        {archived.length === 0 ? (
          <Card>
            <CardHeader>
              <CardDescription>Ingen arkiverte utkast ennå.</CardDescription>
            </CardHeader>
          </Card>
        ) : renderDrafts(archived, true)}
      </section>
    </div>
  );
}
