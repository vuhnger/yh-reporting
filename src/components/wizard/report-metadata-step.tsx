"use client";

import { useWizard } from "./wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AIFillButton } from "./ai-fill-button";

export function ReportMetadataStep() {
  const { state, updateMetadata, setReportType } = useWizard();

  const appendText = (field: keyof typeof state.metadata, text: string) => {
    const current = state.metadata[field] as unknown as string;
    const next = current?.trim() ? `${current.trim()}\n\n${text}` : text;
    updateMetadata({ [field]: next } as any);
  };

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
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Sammendrag</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standard sammendrag.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="summary-text">Sammendrag – ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="summary-text"
                  value={state.metadata.summaryText}
                  onChange={(e) => updateMetadata({ summaryText: e.target.value })}
                  placeholder="Legg til ekstra tekst i sammendraget."
                  className="min-h-[140px] pr-10"
                />
                <AIFillButton
                  field="summaryText"
                  state={state}
                  onApply={(text) => appendText("summaryText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Innledning</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standard innledning.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="intro-extra">Støy og helseeffekter – ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="intro-extra"
                  value={state.metadata.introExtraText}
                  onChange={(e) => updateMetadata({ introExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="introExtraText"
                  state={state}
                  onApply={(text) => appendText("introExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Grenseverdier og tiltaksverdier</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standardtekst og tabell 1.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="thresholds-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="thresholds-extra"
                  value={state.metadata.thresholdsExtraText}
                  onChange={(e) => updateMetadata({ thresholdsExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om grenseverdier og tiltaksverdier."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="thresholdsExtraText"
                  state={state}
                  onApply={(text) => appendText("thresholdsExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Risikovurdering og tiltak</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standardtekst og punktlisten.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="risk-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="risk-extra"
                  value={state.metadata.riskExtraText}
                  onChange={(e) => updateMetadata({ riskExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om risikovurdering og tiltak."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="riskExtraText"
                  state={state}
                  onApply={(text) => appendText("riskExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Informasjon og opplæring</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standardtekst.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="training-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="training-extra"
                  value={state.metadata.trainingExtraText}
                  onChange={(e) => updateMetadata({ trainingExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om informasjon og opplæring."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="trainingExtraText"
                  state={state}
                  onApply={(text) => appendText("trainingExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Gjennomføring og metode</h3>
            <p className="text-xs text-muted-foreground">Vises i “Gjennomføring og metode for målinger”.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="relative">
                <Textarea
                  id="method-text"
                  value={state.metadata.methodText}
                  onChange={(e) => updateMetadata({ methodText: e.target.value })}
                  placeholder="Skriv eventuelle detaljer om gjennomføring/metode her."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="methodText"
                  state={state}
                  onApply={(text) => appendText("methodText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Funn og vurderinger</h3>
            <p className="text-xs text-muted-foreground">Legges til under “Måling av støy”.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="findings-text">Funn og vurderinger – ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="findings-text"
                  value={state.metadata.findingsText}
                  onChange={(e) => updateMetadata({ findingsText: e.target.value })}
                  placeholder="Skriv eventuelle vurderinger/introduksjon til måleresultatene her."
                  className="min-h-[140px] pr-10"
                />
                <AIFillButton
                  field="findingsText"
                  state={state}
                  onApply={(text) => appendText("findingsText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Vurderinger, risikovurdering og konklusjon</h3>
            <p className="text-xs text-muted-foreground">Legges til før per‑måling vurderinger.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="conclusions-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="conclusions-extra"
                  value={state.metadata.conclusionsExtraText}
                  onChange={(e) => updateMetadata({ conclusionsExtraText: e.target.value })}
                  placeholder="Tillegg før per-måling vurderinger."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="conclusionsExtraText"
                  state={state}
                  onApply={(text) => appendText("conclusionsExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Anbefalinger</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standard anbefalinger.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="recommendations-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="recommendations-extra"
                  value={state.metadata.recommendationsExtraText}
                  onChange={(e) => updateMetadata({ recommendationsExtraText: e.target.value })}
                  placeholder="Tillegg til standard anbefalinger."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="recommendationsExtraText"
                  state={state}
                  onApply={(text) => appendText("recommendationsExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Referanser</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standard referanseliste.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="references-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="references-extra"
                  value={state.metadata.referencesExtraText}
                  onChange={(e) => updateMetadata({ referencesExtraText: e.target.value })}
                  placeholder="Tillegg til standard referanseliste."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="referencesExtraText"
                  state={state}
                  onApply={(text) => appendText("referencesExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Vedlegg</h3>
            <p className="text-xs text-muted-foreground">Legges til etter listen over vedlegg.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appendices-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <Textarea
                  id="appendices-extra"
                  value={state.metadata.appendicesExtraText}
                  onChange={(e) => updateMetadata({ appendicesExtraText: e.target.value })}
                  placeholder="Tilleggstekst for vedlegg."
                  className="min-h-[120px] pr-10"
                />
                <AIFillButton
                  field="appendicesExtraText"
                  state={state}
                  onApply={(text) => appendText("appendicesExtraText", text)}
                  className="absolute right-2 top-2"
                />
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
