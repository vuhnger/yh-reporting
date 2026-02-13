"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIndoorClimateData } from "../schema";

function formatValue(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  return `${value}${suffix}`;
}

export function IndoorClimateReviewSection() {
  const { state } = useWizard();
  const indoor = getIndoorClimateData(state);
  if (!indoor) return null;

  const metadata = indoor.metadata;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label className="text-lg font-semibold text-primary">
          Inneklimamalere ({metadata.sensors.length})
        </Label>
      </div>

      {metadata.sensors.length === 0 && (
        <p className="text-sm text-muted-foreground">Ingen malere registrert.</p>
      )}

      {metadata.sensors.map((sensor, index) => (
        <div key={sensor.id} className="rounded-md border p-3 space-y-3">
          <div className="text-sm">
            <p className="font-medium text-primary">
              Inneklimamaler {index + 1}: {sensor.locationName || "-"}
            </p>
            <p className="text-muted-foreground">
              Instrument: {sensor.instrument?.hva || "-"} {sensor.instrument?.serienr ? `(${sensor.instrument.serienr})` : ""}
            </p>
          </div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Temperatur (C)</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.temperature.min)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.temperature.max)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.temperature.avg)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Relativ luftfuktighet (%RH)</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.humidity.min)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.humidity.max)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.humidity.avg)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CO2 (ppm)</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.co2.min)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.co2.max)}</TableCell>
                  <TableCell className="text-right">{formatValue(sensor.stats.co2.avg)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Temperaturtolkning: {sensor.interpretation.temperatureText || "-"}
            </p>
            <p>
              Fukt-tolkning: {sensor.interpretation.humidityText || "-"}
            </p>
            <p>
              CO2-tolkning: {sensor.interpretation.co2Text || "-"}
            </p>
          </div>
        </div>
      ))}

      {metadata.weatherInclude && metadata.weatherSnapshot && (
        <div className="rounded-md border p-3 space-y-2">
          <Label className="text-base font-semibold text-primary">Vaersnapshot</Label>
          <p className="text-sm">
            {metadata.weatherSnapshot.weatherEmoji} {metadata.weatherSnapshot.weatherDescription} -{" "}
            {metadata.weatherSnapshot.address} ({metadata.weatherSnapshot.date})
          </p>
          <p className="text-xs text-muted-foreground">
            Maks/min/gj.snitt temperatur: {formatValue(metadata.weatherSnapshot.maxTempC)} /{" "}
            {formatValue(metadata.weatherSnapshot.minTempC)} /{" "}
            {formatValue(metadata.weatherSnapshot.avgTempC)} C
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-base font-semibold text-primary">Anbefalinger</Label>
        {metadata.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen anbefalinger lagt inn.</p>
        ) : (
          <ul className="list-disc pl-6 text-sm space-y-1">
            {metadata.recommendations.map((recommendation, index) => (
              <li key={`${index}-${recommendation}`}>{recommendation}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
