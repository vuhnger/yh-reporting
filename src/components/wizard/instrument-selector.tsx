"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Instrument } from "@/app/api/instruments/route";
import type { SelectedInstrument } from "@/lib/reports/templates/noise/schema";

interface InstrumentSelectorProps {
  selectedInstruments: SelectedInstrument[];
  onChange: (instruments: SelectedInstrument[]) => void;
}

export function InstrumentSelector({
  selectedInstruments,
  onChange,
}: InstrumentSelectorProps) {
  const [sheetInstruments, setSheetInstruments] = useState<Instrument[]>([]);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/instruments");
        if (!res.ok) throw new Error("Kunne ikke hente instrumenter");
        const data = await res.json();
        if (!cancelled) {
          setSheetInstruments(data.instruments);
          setSheetUrl(data.sheetUrl);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const isSheetSelected = useCallback(
    (inst: Instrument) =>
      selectedInstruments.some(
        (s) => s.kilde === "sheets" && s.hva === inst.hva && s.serienr === inst.serienr
      ),
    [selectedInstruments]
  );

  const toggleSheet = useCallback(
    (inst: Instrument) => {
      if (isSheetSelected(inst)) {
        onChange(
          selectedInstruments.filter(
            (s) => !(s.kilde === "sheets" && s.hva === inst.hva && s.serienr === inst.serienr)
          )
        );
      } else {
        onChange([
          ...selectedInstruments,
          {
            id: `sheets-${inst.serienr || inst.hva}-${Date.now()}`,
            hva: inst.hva,
            modell: inst.modell,
            serienr: inst.serienr,
            sistKalibrert: inst.sistKalibrert,
            kilde: "sheets",
          },
        ]);
      }
    },
    [selectedInstruments, onChange, isSheetSelected]
  );

  const addManual = useCallback(() => {
    onChange([
      ...selectedInstruments,
      {
        id: `manuell-${Date.now()}`,
        hva: "",
        modell: "",
        serienr: "",
        sistKalibrert: null,
        kilde: "manuell",
      },
    ]);
  }, [selectedInstruments, onChange]);

  const removeManual = useCallback(
    (id: string) => onChange(selectedInstruments.filter((i) => i.id !== id)),
    [selectedInstruments, onChange]
  );

  const updateField = useCallback(
    (id: string, field: keyof SelectedInstrument, value: string) => {
      onChange(
        selectedInstruments.map((i) =>
          i.id === id ? { ...i, [field]: value } : i
        )
      );
    },
    [selectedInstruments, onChange]
  );

  const manualInstruments = selectedInstruments.filter((i) => i.kilde === "manuell");

  return (
    <div className="space-y-4">
      {/* Checkbox list from sheets */}
      <div className="space-y-2">
        <Label>Velg utstyr fra utstyrsoversikt</Label>
        {loading && (
          <p className="text-sm text-muted-foreground">Henter instrumenter fra utstyrsoversikt...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && sheetInstruments.length === 0 && (
          <p className="text-sm text-muted-foreground">Ingen instrumenter funnet.</p>
        )}
        {!loading && !error && sheetInstruments.length > 0 && (
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto rounded-md border p-3">
            {sheetInstruments.map((inst, i) => {
              const checked = isSheetSelected(inst);
              return (
                <label
                  key={`${inst.hva}-${inst.serienr}-${i}`}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSheet(inst)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{inst.hva}</div>
                    <div className="text-xs text-muted-foreground">
                      {inst.modell && <span>{inst.modell}</span>}
                      {inst.serienr && <span> · SN: {inst.serienr}</span>}
                      {inst.sistKalibrert && (
                        <span> · Kalibrert: {inst.sistKalibrert}</span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        {sheetUrl && (
          <p className="text-xs text-muted-foreground">
            Utstyrsinformasjon hentet fra{" "}
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              utstyrsoversikten
            </a>.
          </p>
        )}
      </div>

      {/* Manual instruments */}
      {manualInstruments.length > 0 && (
        <div className="space-y-2">
          <Label>Manuelt lagt til</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Modell</TableHead>
                <TableHead>Serienr.</TableHead>
                <TableHead>Sist kalibrert</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {manualInstruments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <Input
                      value={inst.hva}
                      onChange={(e) => updateField(inst.id, "hva", e.target.value)}
                      placeholder="Instrument"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={inst.modell}
                      onChange={(e) => updateField(inst.id, "modell", e.target.value)}
                      placeholder="Modell"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={inst.serienr}
                      onChange={(e) => updateField(inst.id, "serienr", e.target.value)}
                      placeholder="Serienr."
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={inst.sistKalibrert ?? ""}
                      onChange={(e) => updateField(inst.id, "sistKalibrert", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeManual(inst.id)}
                      aria-label="Fjern instrument"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addManual}>
        Legg til manuelt
      </Button>
    </div>
  );
}
