"use client";

import { useWizard } from "./wizard-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Building2 } from "lucide-react";

export function ClientStep() {
  const { state, updateClient } = useWizard();
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedOrgNr = useRef<string | null>(null);

  const fetchClientData = useCallback(async (orgNr: string) => {
    if (orgNr === lastFetchedOrgNr.current && state.client.name) return;

    lastFetchedOrgNr.current = orgNr;
    setIsLoading(true);

    try {
      const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgNr}`);

      if (!response.ok) return;

      const data = await response.json();

      const name = data.navn || "";
      const addr = data.forretningsadresse;
      let addressString = "";

      if (addr) {
        const lines = addr.adresse || [];
        addressString = `${lines.join(", ")}, ${addr.postnummer} ${addr.poststed}`;
      }

      updateClient({
        name,
        address: addressString,
        industry: data.naeringskode1?.beskrivelse || "",
      });
    } catch (error) {
      console.error("Error fetching company data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [updateClient, state.client.name]);

  useEffect(() => {
    const cleanOrgNr = state.client.orgNr.replace(/\D/g, "");
    if (cleanOrgNr.length === 9 && cleanOrgNr !== lastFetchedOrgNr.current) {
      fetchClientData(cleanOrgNr);
    }
  }, [state.client.orgNr, fetchClientData]);

  const handleOrgNrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClient({ orgNr: e.target.value });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Bedriftsinformasjon</CardTitle>
        <CardDescription>Skriv inn 9-sifret organisasjonsnummer for å fylle ut detaljer automatisk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="orgNr" className="text-sm font-semibold">Organisasjonsnummer</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="orgNr"
              placeholder="f.eks. 999 888 777"
              className="pl-10 text-lg tracking-wider"
              value={state.client.orgNr}
              onChange={handleOrgNrChange}
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        {state.client.name && (
          <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase text-muted-foreground font-bold">Bedriftsnavn</Label>
              <div className="flex items-center gap-2 text-lg font-medium">
                <Building2 className="h-5 w-5 text-primary" />
                <Input
                  id="name"
                  className="p-0 h-auto border-none focus-visible:ring-0 text-lg font-semibold"
                  value={state.client.name}
                  onChange={(e) => updateClient({ name: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
