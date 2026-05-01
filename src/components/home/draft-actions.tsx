"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Loader2, Paperclip, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/components/wizard/wizard-context";
import type { ReportAttachment } from "@/lib/reports/template-types";

export function DraftActions({ initialDraftId }: { initialDraftId?: string }) {
  const { state, setFiles } = useWizard();
  const [draftId, setDraftId] = useState(initialDraftId ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lifecycleBusy, setLifecycleBusy] = useState<"archive" | "delete" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstAutosaveRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const saveLabel = useMemo(() => {
    if (status === "saving") return "Lagrer utkast...";
    if (status === "saved") return "Utkast lagret";
    return "Lagre utkast";
  }, [status]);

  const hasMeaningfulContent = Boolean(
    state.reportType ||
      state.client.name.trim() ||
      state.client.orgNr.trim() ||
      state.sharedMetadata.assignment.trim()
  );

  const saveDraft = useCallback(async (options?: { silent?: boolean; allowCreate?: boolean }) => {
    const silent = options?.silent ?? false;
    const allowCreate = options?.allowCreate ?? true;
    if (!hasMeaningfulContent && !draftId) return null;
    if (!allowCreate && !draftId) return null;

    setStatus("saving");
    if (!silent) setError(null);

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
      if (!silent) router.refresh();
      return nextDraftId;
    } catch (saveError) {
      console.error(saveError);
      setStatus("error");
      if (!silent) {
        setError(saveError instanceof Error ? saveError.message : "Kunne ikke lagre utkast.");
      }
      return null;
    }
  }, [draftId, hasMeaningfulContent, pathname, router, state]);

  async function handleSave() {
    await saveDraft();
  }

  useEffect(() => {
    if (!hasMeaningfulContent) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      if (isFirstAutosaveRef.current) {
        isFirstAutosaveRef.current = false;
      }
      void saveDraft({ silent: true, allowCreate: true });
    }, draftId ? 2000 : 3000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    draftId,
    hasMeaningfulContent,
    saveDraft,
    state.client,
    state.reportType,
    state.sharedMetadata,
    state.weather,
    state.data,
  ]);

  async function uploadAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const ensuredDraftId = draftId || (await saveDraft({ allowCreate: true }));
      if (!ensuredDraftId) {
        throw new Error("Lagre utkastet først før du laster opp vedlegg.");
      }

      const newAttachments: ReportAttachment[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("file", file);

        const response = await fetch(`/api/reports/${ensuredDraftId}/attachments`, {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || `Kunne ikke laste opp ${file.name}.`);
        }
        newAttachments.push(payload.attachment as ReportAttachment);
      }

      setFiles([...state.files, ...newAttachments]);
      router.refresh();
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Kunne ikke laste opp vedlegg.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!draftId) return;
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${draftId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Kunne ikke slette vedlegg.");
      }

      setFiles(state.files.filter((file) => file.id !== attachmentId));
      router.refresh();
    } catch (removeError) {
      console.error(removeError);
      setError(removeError instanceof Error ? removeError.message : "Kunne ikke slette vedlegg.");
    } finally {
      setUploading(false);
    }
  }

  async function handleArchive() {
    if (!draftId) return;
    setLifecycleBusy("archive");
    setError(null);
    try {
      const response = await fetch(`/api/reports/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Kunne ikke arkivere utkast.");
      }
      router.push("/reports");
      router.refresh();
    } catch (archiveError) {
      console.error(archiveError);
      setError(archiveError instanceof Error ? archiveError.message : "Kunne ikke arkivere utkast.");
    } finally {
      setLifecycleBusy(null);
    }
  }

  async function handleDelete() {
    if (!draftId || !window.confirm("Slette dette utkastet permanent?")) return;
    setLifecycleBusy("delete");
    setError(null);
    try {
      const response = await fetch(`/api/reports/${draftId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Kunne ikke slette utkast.");
      }
      router.push("/reports");
      router.refresh();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Kunne ikke slette utkast.");
    } finally {
      setLifecycleBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-3 flex-1">
        <p className="font-medium text-primary">Lagre rapportutkast</p>
        <p className="text-sm text-muted-foreground">
          Utkast autosaves per bruker. Vedlegg lagres i GCS når utkastet har fått en ID.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void uploadAttachments(event.target.files)}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Last opp vedlegg
            </Button>
            <span className="text-xs text-muted-foreground">PDF-rapporten viser kun vedleggsnavn.</span>
          </div>
          {state.files.length > 0 && (
            <div className="space-y-2 rounded border bg-white p-3">
              {state.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => void handleRemoveAttachment(file.id)} disabled={uploading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/">Se lagrede rapporter</Link>
        </Button>
        <Button type="button" onClick={handleSave} disabled={status === "saving"} className="min-w-40">
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLabel}
        </Button>
        {draftId && (
          <>
            <Button type="button" variant="outline" onClick={() => void handleArchive()} disabled={lifecycleBusy !== null}>
              {lifecycleBusy === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Arkiver
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={lifecycleBusy !== null}>
              {lifecycleBusy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Slett
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
