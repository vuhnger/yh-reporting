"use client";

import { useWizard } from "./wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReportMetadataStep() {
  const { state, updateMetadata, setReportType } = useWizard();

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Forsideinformasjon</CardTitle>
        <CardDescription>
          Opplysninger som vises på forsiden av rapporten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Rapporttype</Label>
            <Select value={state.reportType} onValueChange={(val: any) => setReportType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Velg type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="noise">Støy</SelectItem>
                <SelectItem value="indoor-climate">Inneklima</SelectItem>
                <SelectItem value="chemical">Kjemikalier / Støv</SelectItem>
                <SelectItem value="light">Lys</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment">Oppdrag (auto)</Label>
            <Input
              id="assignment"
              value={state.metadata.assignment}
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
              value={state.metadata.date}
              onChange={(e) => updateMetadata({ date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participants">Deltakere</Label>
            <Input
              id="participants"
              value={state.metadata.participants}
              onChange={(e) => updateMetadata({ participants: e.target.value })}
              placeholder="F.eks. Marie Håland"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-author">Rapport skrevet av</Label>
            <Input
              id="report-author"
              value={state.metadata.author}
              onChange={(e) => updateMetadata({ author: e.target.value })}
              placeholder="F.eks. Marie Håland"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-date">Dato for rapport (auto)</Label>
            <Input
              id="report-date"
              type="date"
              value={state.metadata.reportDate}
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
              value={state.metadata.reportSentTo}
              onChange={(e) => updateMetadata({ reportSentTo: e.target.value })}
              placeholder="F.eks. Irene Furulund"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-person">Kontaktperson i virksomheten</Label>
            <Input
              id="contact-person"
              value={state.metadata.contactPerson}
              onChange={(e) => updateMetadata({ contactPerson: e.target.value })}
              placeholder="F.eks. Irene Furulund"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="advisor">KAM/HMS-rådgiver i Dr. Dropin Bedrift</Label>
            <Input
              id="advisor"
              value={state.metadata.advisor}
              onChange={(e) => updateMetadata({ advisor: e.target.value })}
              placeholder="F.eks. Ida Lund"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="summary-text">Sammendrag (valgfritt)</Label>
            <Textarea
              id="summary-text"
              value={state.metadata.summaryText}
              onChange={(e) => updateMetadata({ summaryText: e.target.value })}
              placeholder="Hvis du vil overstyre standardsammendraget, skriv teksten her."
              className="min-h-[140px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurement-device">Måleinstrument</Label>
            <Input
              id="measurement-device"
              value={state.metadata.measurementDevice}
              onChange={(e) => updateMetadata({ measurementDevice: e.target.value })}
              placeholder="F.eks. Cirrus Optimus Red CR: 161C"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurement-serial">Serienr. instrument</Label>
            <Input
              id="measurement-serial"
              value={state.metadata.measurementSerial}
              onChange={(e) => updateMetadata({ measurementSerial: e.target.value })}
              placeholder="F.eks. G304333"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calibrator-model">Kalibrator</Label>
            <Input
              id="calibrator-model"
              value={state.metadata.calibratorModel}
              onChange={(e) => updateMetadata({ calibratorModel: e.target.value })}
              placeholder="F.eks. Cirrus Acoustic Calibrator CR: 515"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calibrator-serial">Serienr. kalibrator</Label>
            <Input
              id="calibrator-serial"
              value={state.metadata.calibratorSerial}
              onChange={(e) => updateMetadata({ calibratorSerial: e.target.value })}
              placeholder="F.eks. 101825"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-calibration">Siste kalibrering</Label>
            <Input
              id="last-calibration"
              type="date"
              value={state.metadata.lastCalibrationDate}
              onChange={(e) => updateMetadata({ lastCalibrationDate: e.target.value })}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="method-text">Metode / tilleggstekst (valgfritt)</Label>
            <Textarea
              id="method-text"
              value={state.metadata.methodText}
              onChange={(e) => updateMetadata({ methodText: e.target.value })}
              placeholder="Skriv eventuelle detaljer om gjennomføring/metode her."
              className="min-h-[120px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
