"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CloudSun, Thermometer } from "lucide-react";

export function ReviewStep() {
  const { state, nextStep, prevStep } = useWizard();

  // Mock parsed data based on uploaded files
  const mockStats = {
    temp: { min: 18.2, max: 24.5, avg: 21.3 },
    co2: { min: 410, max: 1250, avg: 850 },
    humidity: { min: 30, max: 45, avg: 38 },
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Review Data</CardTitle>
        <CardDescription>Verify the extracted statistics and external data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Weather Section */}
        <div className="flex items-start gap-4 p-4 bg-secondary/20 rounded-lg border border-secondary">
          <CloudSun className="h-8 w-8 text-primary mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-primary">Weather Data (Auto-fetched)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Oslo, {new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-6 text-sm">
              <span><strong>Temp:</strong> 12°C</span>
              <span><strong>Precipitation:</strong> 0mm</span>
              <span><strong>Wind:</strong> 3 m/s SW</span>
            </div>
          </div>
          <Button variant="outline" size="sm">Edit</Button>
        </div>

        {/* Stats Table */}
        <div className="space-y-2">
          <Label>Extracted Measurements</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Thermometer className="h-4 w-4" /> Temperature
                </TableCell>
                <TableCell>{mockStats.temp.min}°C</TableCell>
                <TableCell>{mockStats.temp.max}°C</TableCell>
                <TableCell>{mockStats.temp.avg}°C</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Normal
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">CO2</TableCell>
                <TableCell>{mockStats.co2.min} ppm</TableCell>
                <TableCell className="text-destructive font-bold">{mockStats.co2.max} ppm</TableCell>
                <TableCell>{mockStats.co2.avg} ppm</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    High
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Humidity</TableCell>
                <TableCell>{mockStats.humidity.min}%</TableCell>
                <TableCell>{mockStats.humidity.max}%</TableCell>
                <TableCell>{mockStats.humidity.avg}%</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Low
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button onClick={nextStep}>Generate Report</Button>
      </CardFooter>
    </Card>
  );
}
