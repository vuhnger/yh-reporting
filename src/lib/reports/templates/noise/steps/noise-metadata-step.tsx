"use client";

import { useWizard } from "@/components/wizard/wizard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageTextarea } from "@/components/ui/image-textarea";
import { AIFillButton } from "@/components/wizard/ai-fill-button";
import { InstrumentSelector } from "@/components/wizard/instrument-selector";
import { getNoiseData } from "../schema";
import type { NoiseMetadata, SelectedInstrument } from "../schema";

export function NoiseMetadataStep() {
  const { state, updateNoiseMetadata } = useWizard();
  const noise = getNoiseData(state);
  if (!noise) return null;

  const getValue = (field: keyof NoiseMetadata) => {
    const value = noise.metadata[field];
    return typeof value === "string" ? value : "";
  };
  const setValue = (field: keyof NoiseMetadata, text: string) =>
    updateNoiseMetadata({ [field]: text });

  const getImage = (field: string) => noise.metadata.textImages?.[field] || "";
  const setImage = (field: string, image: string | null) => {
    const next = { ...(noise.metadata.textImages ?? {}) };
    if (image) {
      next[field] = image;
    } else {
      delete next[field];
    }
    updateNoiseMetadata({ textImages: next });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Støyrapport – detaljer</CardTitle>
        <CardDescription>
          Fyll ut støyspesifikke felter. AI kan hjelpe deg med å generere tekst.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Sammendrag</h3>
            <p className="text-xs text-muted-foreground">Legges til etter standard sammendrag.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="summary-text">Sammendrag – ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <ImageTextarea
                  id="summary-text"
                  value={noise.metadata.summaryText}
                  onChange={(e) => updateNoiseMetadata({ summaryText: e.target.value })}
                  placeholder="Legg til ekstra tekst i sammendraget."
                  className="min-h-[140px] pr-10"
                  imageSrc={getImage("summaryText")}
                  onImageChange={(image) => setImage("summaryText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="summaryText"
                      state={state}
                      getValue={() => getValue("summaryText")}
                      setValue={(text) => setValue("summaryText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="intro-extra"
                  value={noise.metadata.introExtraText}
                  onChange={(e) => updateNoiseMetadata({ introExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("introExtraText")}
                  onImageChange={(image) => setImage("introExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="introExtraText"
                      state={state}
                      getValue={() => getValue("introExtraText")}
                      setValue={(text) => setValue("introExtraText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="thresholds-extra"
                  value={noise.metadata.thresholdsExtraText}
                  onChange={(e) => updateNoiseMetadata({ thresholdsExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om grenseverdier og tiltaksverdier."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("thresholdsExtraText")}
                  onImageChange={(image) => setImage("thresholdsExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="thresholdsExtraText"
                      state={state}
                      getValue={() => getValue("thresholdsExtraText")}
                      setValue={(text) => setValue("thresholdsExtraText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="risk-extra"
                  value={noise.metadata.riskExtraText}
                  onChange={(e) => updateNoiseMetadata({ riskExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om risikovurdering og tiltak."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("riskExtraText")}
                  onImageChange={(image) => setImage("riskExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="riskExtraText"
                      state={state}
                      getValue={() => getValue("riskExtraText")}
                      setValue={(text) => setValue("riskExtraText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="training-extra"
                  value={noise.metadata.trainingExtraText}
                  onChange={(e) => updateNoiseMetadata({ trainingExtraText: e.target.value })}
                  placeholder="Tillegg til standardtekst om informasjon og opplæring."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("trainingExtraText")}
                  onImageChange={(image) => setImage("trainingExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="trainingExtraText"
                      state={state}
                      getValue={() => getValue("trainingExtraText")}
                      setValue={(text) => setValue("trainingExtraText", text)}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Gjennomføring og metode</h3>
            <p className="text-xs text-muted-foreground">Vises i &quot;Gjennomføring og metode for målinger&quot;.</p>
          </div>

          <InstrumentSelector
            selectedInstruments={noise.metadata.selectedInstruments}
            onChange={(instruments: SelectedInstrument[]) =>
              updateNoiseMetadata({ selectedInstruments: instruments })
            }
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="method-text">Metode / tilleggstekst (valgfritt)</Label>
              <div className="relative">
                <ImageTextarea
                  id="method-text"
                  value={noise.metadata.methodText}
                  onChange={(e) => updateNoiseMetadata({ methodText: e.target.value })}
                  placeholder="Skriv eventuelle detaljer om gjennomføring/metode her."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("methodText")}
                  onImageChange={(image) => setImage("methodText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="methodText"
                      state={state}
                      getValue={() => getValue("methodText")}
                      setValue={(text) => setValue("methodText", text)}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Resultater</h3>
            <p className="text-xs text-muted-foreground">Legges til under &quot;Måling av støy&quot;.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="findings-text">Resultater – ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <ImageTextarea
                  id="findings-text"
                  value={noise.metadata.findingsText}
                  onChange={(e) => updateNoiseMetadata({ findingsText: e.target.value })}
                  placeholder="Skriv eventuelle vurderinger/introduksjon til måleresultatene her."
                  className="min-h-[140px] pr-10"
                  imageSrc={getImage("findingsText")}
                  onImageChange={(image) => setImage("findingsText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="findingsText"
                      state={state}
                      getValue={() => getValue("findingsText")}
                      setValue={(text) => setValue("findingsText", text)}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Diskusjon</h3>
            <p className="text-xs text-muted-foreground">Legges til før per-måling vurderinger.</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="conclusions-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <ImageTextarea
                  id="conclusions-extra"
                  value={noise.metadata.conclusionsExtraText}
                  onChange={(e) => updateNoiseMetadata({ conclusionsExtraText: e.target.value })}
                  placeholder="Tillegg før per-måling vurderinger."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("conclusionsExtraText")}
                  onImageChange={(image) => setImage("conclusionsExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="conclusionsExtraText"
                      state={state}
                      getValue={() => getValue("conclusionsExtraText")}
                      setValue={(text) => setValue("conclusionsExtraText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="recommendations-extra"
                  value={noise.metadata.recommendationsExtraText}
                  onChange={(e) => updateNoiseMetadata({ recommendationsExtraText: e.target.value })}
                  placeholder="Tillegg til standard anbefalinger."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("recommendationsExtraText")}
                  onImageChange={(image) => setImage("recommendationsExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="recommendationsExtraText"
                      state={state}
                      getValue={() => getValue("recommendationsExtraText")}
                      setValue={(text) => setValue("recommendationsExtraText", text)}
                    />
                  }
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
              <Label htmlFor="references-text">Manuelle referanser</Label>
              <ImageTextarea
                id="references-text"
                value={noise.metadata.referencesText}
                onChange={(e) => updateNoiseMetadata({ referencesText: e.target.value })}
                placeholder="Legg til egne referanser (en per linje)."
                className="min-h-[120px]"
                imageSrc={getImage("referencesText")}
                onImageChange={(image) => setImage("referencesText", image)}
              />
              <p className="text-xs text-muted-foreground">Legges til som egne punkter under referanser.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="references-extra">Ekstra tekst (valgfritt)</Label>
              <div className="relative">
                <ImageTextarea
                  id="references-extra"
                  value={noise.metadata.referencesExtraText}
                  onChange={(e) => updateNoiseMetadata({ referencesExtraText: e.target.value })}
                  placeholder="Tillegg til standard referanseliste."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("referencesExtraText")}
                  onImageChange={(image) => setImage("referencesExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="referencesExtraText"
                      state={state}
                      getValue={() => getValue("referencesExtraText")}
                      setValue={(text) => setValue("referencesExtraText", text)}
                    />
                  }
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
                <ImageTextarea
                  id="appendices-extra"
                  value={noise.metadata.appendicesExtraText}
                  onChange={(e) => updateNoiseMetadata({ appendicesExtraText: e.target.value })}
                  placeholder="Tilleggstekst for vedlegg."
                  className="min-h-[120px] pr-10"
                  imageSrc={getImage("appendicesExtraText")}
                  onImageChange={(image) => setImage("appendicesExtraText", image)}
                  actions={
                    <AIFillButton
                      reportType="noise"
                      field="appendicesExtraText"
                      state={state}
                      getValue={() => getValue("appendicesExtraText")}
                      setValue={(text) => setValue("appendicesExtraText", text)}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
