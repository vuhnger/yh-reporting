"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Search } from "lucide-react";

export function ClientStep() {
  const { state, updateClient, nextStep } = useWizard();
  const [isLoading, setIsLoading] = useState(false);

  const handleOrgNrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClient({ orgNr: e.target.value });
  };

  const fetchClientData = async () => {
    if (!state.client.orgNr) return;
    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      updateClient({
        name: "Acme Corp AS",
        address: "Industriveien 12, 0123 Oslo",
        industry: "Construction",
      });
      setIsLoading(false);
    }, 1000);
  };

  const isValid = state.client.orgNr.length > 0 && state.client.name.length > 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
        <CardDescription>Start by entering the client's Norwegian organization number.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="orgNr">Organization Number</Label>
            <Input
              id="orgNr"
              placeholder="999 999 999"
              value={state.client.orgNr}
              onChange={handleOrgNrChange}
            />
          </div>
          <Button onClick={fetchClientData} disabled={isLoading || !state.client.orgNr}>
            {isLoading ? "Searching..." : <><Search className="mr-2 h-4 w-4" /> Lookup</>}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            value={state.client.name}
            onChange={(e) => updateClient({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={state.client.address}
            onChange={(e) => updateClient({ address: e.target.value })}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={nextStep} disabled={!isValid}>
          Next Step
        </Button>
      </CardFooter>
    </Card>
  );
}
