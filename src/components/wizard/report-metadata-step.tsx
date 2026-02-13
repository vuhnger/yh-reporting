"use client";

import { useEffect, useRef, useState } from "react";
import { useWizard } from "./wizard-context";
import type { ReportType } from "@/lib/reports/template-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIndoorClimateData } from "@/lib/reports/templates/indoor-climate/schema";

interface AddressSuggestion {
  id: string;
  label: string;
  lat: number | null;
  lon: number | null;
}

export function SharedMetadataStep() {
  const { state, updateSharedMetadata, setReportType, updateClient, updateIndoorClimateMetadata } = useWizard();
  const indoor = getIndoorClimateData(state);
  const weatherAddress = indoor?.metadata.weatherAddress ?? "";
  const weatherInclude = indoor?.metadata.weatherInclude ?? false;
  const weatherLat = indoor?.metadata.weatherLat ?? null;
  const weatherLon = indoor?.metadata.weatherLon ?? null;
  const weatherSnapshot = indoor?.metadata.weatherSnapshot ?? null;
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState(() => weatherAddress || state.client.address || "");
  const weatherInFlightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.sharedMetadata.reportDate) return;
    const today = new Date().toISOString().split("T")[0];
    updateSharedMetadata({ reportDate: today });
  }, [state.sharedMetadata.reportDate, updateSharedMetadata]);

  useEffect(() => {
    if (state.reportType !== "indoor-climate") return;
    if (addressQuery.trim()) return;
    const fallback = weatherAddress || state.client.address || "";
    if (fallback) {
      setAddressQuery(fallback);
    }
  }, [addressQuery, state.client.address, state.reportType, weatherAddress]);

  useEffect(() => {
    if (state.reportType !== "indoor-climate" || !indoor) {
      setAddressSuggestions([]);
      setAddressError(null);
      setAddressDropdownOpen(false);
      setAddressLoading(false);
      return;
    }

    const query = addressQuery.trim();
    const selectedAddressLocked =
      weatherLat !== null && weatherLon !== null && query === weatherAddress.trim();

    if (selectedAddressLocked) {
      setAddressSuggestions([]);
      setAddressError(null);
      setAddressDropdownOpen(false);
      setAddressLoading(false);
      return;
    }

    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressError(null);
      setAddressDropdownOpen(false);
      setAddressLoading(false);
      return;
    }

    let cancelled = false;
    setAddressLoading(true);
    setAddressError(null);

    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
        const payload = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setAddressError(payload?.error || "Kunne ikke hente adresseforslag.");
            setAddressSuggestions([]);
          }
          return;
        }

        if (!cancelled) {
          const suggestions = Array.isArray(payload.results)
            ? (payload.results as AddressSuggestion[])
            : [];
          setAddressSuggestions(suggestions);
          if (suggestions.length > 0) {
            setAddressDropdownOpen(true);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setAddressError("Kunne ikke hente adresseforslag.");
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setAddressLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [addressQuery, indoor, state.reportType, weatherAddress, weatherLat, weatherLon]);

  useEffect(() => {
    if (state.reportType !== "indoor-climate" || !indoor || !weatherInclude) {
      setWeatherError(null);
      return;
    }

    const address = weatherAddress.trim();
    if (address.length < 3 || weatherLat === null || weatherLon === null) {
      setWeatherError(null);
      return;
    }

    const executionDate = state.sharedMetadata.date;
    if (
      weatherSnapshot &&
      weatherSnapshot.date === executionDate &&
      weatherSnapshot.address.trim() === address
    ) {
      setWeatherError(null);
      return;
    }

    const requestKey = `${address}|${executionDate}|${weatherLat}|${weatherLon}`;
    if (weatherInFlightKeyRef.current === requestKey) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      weatherInFlightKeyRef.current = requestKey;
      try {
        if (!cancelled) setWeatherError(null);

        const params = new URLSearchParams({
          address,
          date: executionDate,
        });
        params.set("lat", String(weatherLat));
        params.set("lon", String(weatherLon));

        const response = await fetch(`/api/weather?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            const message = payload?.error || "Kunne ikke hente vaerdata.";
            setWeatherError(message);
            updateIndoorClimateMetadata({ weatherFetchError: message });
          }
          return;
        }

        if (!cancelled) {
          setWeatherError(null);
          updateIndoorClimateMetadata({
            weatherAddress: address,
            weatherDate: executionDate,
            weatherSnapshot: payload,
            weatherFetchError: "",
          });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          const message = "Kunne ikke hente vaerdata.";
          setWeatherError(message);
          updateIndoorClimateMetadata({ weatherFetchError: message });
        }
      } finally {
        if (weatherInFlightKeyRef.current === requestKey) {
          weatherInFlightKeyRef.current = null;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    indoor,
    state.reportType,
    state.sharedMetadata.date,
    updateIndoorClimateMetadata,
    weatherAddress,
    weatherInclude,
    weatherLat,
    weatherLon,
    weatherSnapshot,
  ]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Forsideinformasjon</CardTitle>
        <CardDescription>
          Opplysninger som vises på forsiden av rapporten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Forside</h3>
            <p className="text-xs text-muted-foreground">Vises på forsiden av PDF.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Rapporttype</Label>
              <Select
                value={state.reportType}
                onValueChange={(val: ReportType) => setReportType(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noise">Støy</SelectItem>
                  <SelectItem value="indoor-climate">Inneklima</SelectItem>
                  {/* <SelectItem value="chemical">Kjemikalier / Støv</SelectItem> */}
                  {/* <SelectItem value="light">Lys</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment">Oppdrag (auto)</Label>
              <Input
                id="assignment"
                value={state.sharedMetadata.assignment}
                readOnly
                className="bg-slate-50"
                placeholder="Genereres automatisk basert på rapporttype og bedrift"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="execution-date">Dato for utførelse</Label>
              <Input
                id="execution-date"
                type="date"
                value={state.sharedMetadata.date}
                onChange={(e) => updateSharedMetadata({ date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Deltakere</Label>
              <Input
                id="participants"
                value={state.sharedMetadata.participants}
                onChange={(e) => updateSharedMetadata({ participants: e.target.value })}
                placeholder="F.eks. Marie Håland"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-author">Rapport skrevet av</Label>
              <Input
                id="report-author"
                value={state.sharedMetadata.author}
                onChange={(e) => updateSharedMetadata({ author: e.target.value })}
                placeholder="F.eks. Marie Håland"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-date">Dato for rapport (auto)</Label>
              <Input
                id="report-date"
                type="date"
                value={state.sharedMetadata.reportDate}
                readOnly
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Antall vedlegg (auto)</Label>
              <Input
                id="attachments"
                value={String(state.files.length)}
                readOnly
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-sent-to">Rapport sendt til</Label>
              <Input
                id="report-sent-to"
                value={state.sharedMetadata.reportSentTo}
                onChange={(e) => updateSharedMetadata({ reportSentTo: e.target.value })}
                placeholder="F.eks. Irene Furulund"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-person">Kontaktperson i virksomheten</Label>
              <Input
                id="contact-person"
                value={state.sharedMetadata.contactPerson}
                onChange={(e) => updateSharedMetadata({ contactPerson: e.target.value })}
                placeholder="F.eks. Irene Furulund"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="advisor">KAM/HMS-rådgiver i Dr. Dropin Bedrift</Label>
              <Input
                id="advisor"
                value={state.sharedMetadata.advisor}
                onChange={(e) => updateSharedMetadata({ advisor: e.target.value })}
                placeholder="F.eks. Ida Lund"
              />
            </div>

            {state.reportType === "indoor-climate" && indoor && (
              <div className="space-y-2 md:col-span-2 relative">
                <Label htmlFor="weather-address-report">Adresse</Label>
                <Input
                  id="weather-address-report"
                  value={addressQuery}
                  onChange={(e) => {
                    const nextAddress = e.target.value;
                    setAddressQuery(nextAddress);
                    updateClient({ address: nextAddress });
                    updateIndoorClimateMetadata({
                      weatherAddress: "",
                      weatherLat: null,
                      weatherLon: null,
                      weatherSnapshot: null,
                      weatherFetchError: "",
                    });
                    setAddressDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (addressSuggestions.length > 0 && (weatherLat === null || weatherLon === null)) {
                      setAddressDropdownOpen(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setAddressDropdownOpen(false), 120);
                  }}
                  placeholder="Søk opp adresse"
                  autoComplete="off"
                />
                {addressLoading && (
                  <p className="text-xs text-muted-foreground">Søker adresser...</p>
                )}
                {addressError && (
                  <p className="text-xs text-destructive">{addressError}</p>
                )}
                {weatherError && (
                  <p className="text-xs text-destructive">{weatherError}</p>
                )}
                {addressDropdownOpen && addressSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setAddressQuery(suggestion.label);
                            updateClient({ address: suggestion.label });
                            updateIndoorClimateMetadata({
                              weatherAddress: suggestion.label,
                              weatherLat: suggestion.lat,
                              weatherLon: suggestion.lon,
                              weatherSnapshot: null,
                              weatherFetchError: "",
                            });
                            setAddressSuggestions([]);
                            setAddressError(null);
                            setWeatherError(null);
                            setAddressDropdownOpen(false);
                          }}
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

// Backward-compatible alias
export { SharedMetadataStep as ReportMetadataStep };
