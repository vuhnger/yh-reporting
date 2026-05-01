"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/components/wizard/wizard-context";

export function DraftActions({ initialDraftId }: { initialDraftId?: string }) {
  const { state } = useWizard();
  const [draftId, setDraftId] = useState(initialDraftId ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const saveLabel = useMemo(() => {
    if (status === "saving") return "Lagrer utkast...";
    if (status === "saved") return "Utkast lagret";
    return "Lagre utkast";
  }, [status]);

  async function handleSave() {
    setStatus("saving");
    setError(null);

    try {
      const response = await fetch(draftId ? `/api/reports/${draftId}` : "/api/reports", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Kunne ikke lagre utkast.");
      }

      const nextDraftId = String(payload.draft.id);
      setDraftId(nextDraftId);
      setStatus("saved");
      if (pathname !== `/reports/${nextDraftId}`) {
        router.replace(`/reports/${nextDraftId}`);
      }
      router.refresh();
    } catch (saveError) {
      console.error(saveError);
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Kunne ikke lagre utkast.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-primary">Lagre rapportutkast</p>
        <p className="text-sm text-muted-foreground">
          Utkast lagres per bruker. Opplastede vedlegg lagres ikke ennå.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/reports">Se lagrede rapporter</Link>
        </Button>
        <Button type="button" onClick={handleSave} disabled={status === "saving"} className="min-w-40">
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
