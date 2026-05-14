import { HeadingLevel } from "docx";
import type { ReportState } from "../../template-types";
import {
  createBodyParagraph,
  createBulletList,
  createHeading,
  createParagraphsFromText,
  createTable,
  createTitle,
  createWordDocument,
  downloadBlob,
  packWordDocumentToBlob,
  sanitizeFileNameSegment,
} from "../../word-utils";
import { buildRecommendations, buildSummaryFromMeasurements, summarizeMeasurementComments } from "./pdf";
import { getMeasurementLabel, getNoiseData, groupMeasurementsByLocation } from "./schema";

const NOISE_GROUP_DETAILS = {
  I: {
    label: "Støygruppe I",
    max: 55,
    basis: "LAeq,1h",
    description:
      "Arbeidsforhold med store krav til vedvarende konsentrasjon eller behov for uanstrengt samtale (kontor, undervisningsrom, møterom, spise- og hvilerom).",
  },
  II: {
    label: "Støygruppe II",
    max: 70,
    basis: "LAeq,1h",
    description:
      "Arbeidsforhold der det er viktig å føre samtale, eller vedvarende store krav til presisjon, hurtighet eller oppmerksomhet (kontrollrom, laboratorier, lett monteringsarbeid).",
  },
  III: {
    label: "Støygruppe III",
    max: 85,
    basis: "LAeq,8h",
    description:
      "Arbeidsforhold med støyende maskiner og utstyr som ikke går under gruppe I og II (maskinverksteder, byggeplasser, produksjonshaller).",
  },
} as const;

export function createNoiseReportWordDoc(state: ReportState) {
  const noise = getNoiseData(state);
  if (!noise) throw new Error("Cannot generate noise Word document without noise data");

  const { metadata: noiseMeta, measurements, thresholds } = noise;
  const measurementGroups = groupMeasurementsByLocation(measurements);
  const selectedGroup = NOISE_GROUP_DETAILS[noiseMeta.noiseGroup];
  const reportDate = state.sharedMetadata.reportDate || new Date().toISOString().split("T")[0];
  const summaryText = noiseMeta.summaryText.trim() || buildSummaryFromMeasurements(state);
  const measurementColumnCount = Math.max(
    measurementGroups.reduce((max, group) => Math.max(max, group.measurements.length), 0),
    1
  );

  const children = [
    createTitle("Rapport etter kartlegging av støy"),
    createTable(
      [
        ["Bedrift og avdeling", state.client.name || "-"],
        ["Organisasjonsnummer", state.client.orgNr || "-"],
        ["Dato for utførelse", state.sharedMetadata.date || "-"],
        ["Deltakere", state.sharedMetadata.participants || "-"],
        ["Rapport skrevet av", state.sharedMetadata.author || "-"],
        ["Dato for rapport", reportDate],
        ["Rapport sendt til", state.sharedMetadata.reportSentTo || "-"],
        ["Kontaktperson i virksomheten", state.sharedMetadata.contactPerson || "-"],
        ["KAM/HMS-rådgiver i Dr. Dropin Bedrift", state.sharedMetadata.advisor || "-"],
      ],
      { firstColumnBold: true }
    ),
    createHeading("Sammendrag"),
    ...createParagraphsFromText(summaryText),
    createHeading("Innledning"),
    createHeading("Støy og helseeffekter", HeadingLevel.HEADING_2),
    createBodyParagraph("Støy er definert som uønsket lyd, og deles gjerne inn i to typer:"),
    ...createBulletList([
      "Irriterende støy fra for eksempel ventilasjonsanlegg, vifte i PC-en og lignende.",
      "Skadelig støy fra støyende omgivelser > 80 dB(A) og impulslyd > 130 dB(C).",
    ]),
    createBodyParagraph(
      "Arbeidsgiver skal sikre at arbeidsmiljøet er fullt forsvarlig. Dette gjelder også i hvilken grad støy påvirker arbeidstakernes helse, miljø, sikkerhet og velferd."
    ),
    createBodyParagraph(
      "Lydtrykknivå/støynivå måles i desibel (dB). En alminnelig samtale ligger på omkring 65 dB, mens et rop når opp i ca. 80 dB."
    ),
    createBodyParagraph(
      "Det er ikke bare lydtrykknivået som er avgjørende for om en lyd er skadelig eller ikke. Hvor lenge støyen varer og hvor ofte man blir utsatt for den er også viktig."
    ),
    createBodyParagraph(
      "Sterk støy og/eller høy impulslyd kan gi hørselstap og kronisk øresus (tinitus). I tillegg kan støy også gi andre helseproblemer som:"
    ),
    ...createBulletList([
      "gi høyt blodtrykk",
      "påvirke hjerte og karsystemet",
      "bidra til stress",
      "virke irriterende, trøttende og redusere konsentrasjonsevnen",
      "bidra til muskelspenninger, fordøyelsesproblem, osv.",
      "påvirke ufødte barn",
    ]),
    ...(noiseMeta.introExtraText.trim() ? createParagraphsFromText(noiseMeta.introExtraText.trim()) : []),
    createHeading("Grenseverdier og tiltaksverdier", HeadingLevel.HEADING_2),
    createBodyParagraph(
      "Det er utarbeidet en forskrift hjemlet i arbeidsmiljøloven som definerer tiltaks- og grenseverdier for støy ved ulikt arbeid."
    ),
    createTable(
      [
        [
          "I",
          "Store krav til vedvarende konsentrasjon eller behov for å føre uanstrengt samtale og i spise- og hvilerom",
          "55 dB(A) (LAeq,1h)",
        ],
        [
          "II",
          "Viktig å føre samtale eller vedvarende store krav til presisjon, hurtighet eller oppmerksomhet",
          "70 dB(A) (LAeq,1h)",
        ],
        [
          "III",
          "Støyende maskiner og utstyr under forhold som ikke går innunder arbeidsgruppe I og II",
          "85 dB(A) (LAeq,8h)",
        ],
      ],
      { header: ["Støygruppe", "Arbeidsforhold", "Maks LAeq"] }
    ),
    createBodyParagraph(
      `${selectedGroup.label} er valgt for denne rapporten. Maksnivå for ${selectedGroup.basis} er ${selectedGroup.max} dB(A). ${selectedGroup.description}`
    ),
    createBodyParagraph(
      "Dersom grenseverdiene for støyeksponering overskrides, skal arbeidsgiveren sette i verk strakstiltak for å redusere støyen."
    ),
    createBodyParagraph(
      "Dersom nedre tiltaksverdier overskrides, skal arbeidsgiveren lage en skriftlig tiltaksplan med tekniske eller administrative tiltak for å redusere støyeksponeringen."
    ),
    createBodyParagraph(
      "For arbeidsgruppene I og II, skal støy fra egen aktivitet ikke inngå i vurderingen i forhold til nedre tiltaksverdi så lenge arbeidstakeren selv kan avbryte støyen."
    ),
    ...(noiseMeta.thresholdsExtraText.trim() ? createParagraphsFromText(noiseMeta.thresholdsExtraText.trim()) : []),
    createHeading("Risikovurdering og tiltak", HeadingLevel.HEADING_2),
    createBodyParagraph(
      "Ifølge Forskrift om utførelse av arbeid, § 14, skal arbeidsgiver gjennomføre og dokumentere en risikovurdering."
    ),
    ...createBulletList([
      "vurdere alternative arbeidsmetoder",
      "velge hensiktsmessig arbeidsutstyr som gir minst mulig støy",
      "utforme og tilrettelegge arbeidsplassen og arbeidslokalene",
      "bruke skjermer / innbygging / lydabsorbenter etc. for å dempe lydutbredelse gjennom luft",
      "redusere strukturlyd og vibrasjoner ved å avbalansere, dempe eller isolere lydkilder",
      "ha systematisk vedlikehold av arbeidsutstyr, arbeidsplassen og støydempingstiltak",
      "tilrettelegge for begrensning av eksponeringstid og intensitet, og med stoyfrie hvileperioder",
      "sørge for helseundersøkelser.",
    ]),
    ...(noiseMeta.riskExtraText.trim() ? createParagraphsFromText(noiseMeta.riskExtraText.trim()) : []),
    createHeading("Informasjon og opplæring", HeadingLevel.HEADING_2),
    createBodyParagraph(
      "Arbeidstakere og verneombud skal ha løpende informasjon og opplæring om aktuell risiko i forbindelse med støy dersom arbeidstakerne utsettes for støy som er lik eller overskrider LEX,8h >= 80 dB(A) eller LpC,peak >= 130 dB(C)."
    ),
    ...(noiseMeta.trainingExtraText.trim() ? createParagraphsFromText(noiseMeta.trainingExtraText.trim()) : []),
    createHeading("Gjennomføring og metode for målinger"),
    ...(noiseMeta.selectedInstruments.length > 0
      ? [
          createBodyParagraph(
            "Følgende utstyr ble benyttet ved målingene. Utstyret er egenkalibrert før og etter målingene."
          ),
          createTable(
            noiseMeta.selectedInstruments.map((inst) => [
              inst.hva || "-",
              inst.modell || "-",
              inst.serienr || "-",
              inst.sistKalibrert || "-",
            ]),
            { header: ["Instrument", "Modell", "Serienr.", "Sist kalibrert"] }
          ),
        ]
      : []),
    ...(noiseMeta.methodText.trim() ? createParagraphsFromText(noiseMeta.methodText.trim()) : []),
    createTable(
      measurementGroups.map((group) => [
        group.location,
        ...Array.from({ length: measurementColumnCount }, (_, index) => group.measurements[index]?.duration || "-"),
        summarizeMeasurementComments(group.measurements),
      ]),
      {
        header: [
          "Arbeidssted",
          ...Array.from({ length: measurementColumnCount }, (_, index) => `Varighet ${getMeasurementLabel(index).toLowerCase()}`),
          "Kommentar",
        ],
      }
    ),
    createHeading("Resultater"),
    createHeading("Måling av støy", HeadingLevel.HEADING_2),
    ...(noiseMeta.findingsText.trim() ? createParagraphsFromText(noiseMeta.findingsText.trim()) : []),
    createBodyParagraph(
      "Måleresultatene er gitt i tabellen under. LAeq (dB A) er brukt i resultatene fordi støyen i hovedsak er kontinuerlig over tid."
    ),
    createBodyParagraph(
      `Lydnivå over grenseverdien (LAeq > ${thresholds.lex8h.red} dB(A) eller LCpeak > ${thresholds.peak.red} dB(C)) bør prioriteres for tiltak. ` +
        `Lydnivå over nedre tiltaksverdi (LAeq > ${thresholds.lex8h.orange} dB(A)) krever oppfølging. ` +
        `Lydnivå over anbefalt nivå (LAeq > ${thresholds.lex8h.yellow} dB(A) eller LCpeak > ${thresholds.peak.yellow} dB(C)) bør vurderes.`
    ),
    createTable(
      measurements.map((measurement, index) => [
        getMeasurementLabel(index),
        measurement.location || "-",
        measurement.duration || "-",
        measurement.lex8h !== "" ? `${measurement.lex8h} dB A` : "-",
        measurement.maxPeak !== "" ? `${measurement.maxPeak} dB C` : "-",
        measurement.comment || "-",
      ]),
      { header: ["Måling", "Målested", "Varighet", "LAeq (dB A)", "LCpeak (dB C)", "Kommentar"] }
    ),
    createHeading("Diskusjon"),
    createBodyParagraph(
      "Generelt viste målingene at det ikke er registrert impulsstøy over 130 dB(C). Videre følger en kort vurdering per målepunkt, basert på registrerte nivåer, varighet og tilgjengelig informasjon."
    ),
    ...(noiseMeta.conclusionsExtraText.trim() ? createParagraphsFromText(noiseMeta.conclusionsExtraText.trim()) : []),
    createHeading("Konklusjon"),
    ...measurements.flatMap((measurement) => {
      const lex = measurement.lex8h !== "" ? Number(measurement.lex8h) : null;
      const peak = measurement.maxPeak !== "" ? Number(measurement.maxPeak) : null;
      const parts: string[] = [];

      if (lex !== null && Number.isFinite(lex)) {
        if (lex > thresholds.lex8h.red) {
          parts.push(`LAeq (${lex} dB) overstiger øvre tiltaksverdi.`);
        } else if (lex > thresholds.lex8h.orange) {
          parts.push(`LAeq (${lex} dB) overstiger nedre tiltaksverdi for støyende arbeid.`);
        } else if (lex > thresholds.lex8h.yellow) {
          parts.push(`LAeq (${lex} dB) ligger over anbefalt nivå.`);
        } else {
          parts.push(`LAeq (${lex} dB) ligger under anbefalte nivåer.`);
        }
      }

      if (peak !== null && Number.isFinite(peak)) {
        if (peak > thresholds.peak.red) {
          parts.push(`LCpeak-nivå (${peak} dB(C)) overstiger grenseverdi.`);
        } else if (peak > thresholds.peak.yellow) {
          parts.push(`LCpeak-nivå (${peak} dB(C)) ligger over anbefalt nivå.`);
        }
      }

      const durationText = measurement.duration ? `Varighet: ${measurement.duration}.` : "";
      const commentText = measurement.comment ? `Kommentar: ${measurement.comment}.` : "";
      return createParagraphsFromText(
        `${measurement.location || "Ikke angitt"}: ${parts.join(" ")} ${durationText} ${commentText}`.trim()
      );
    }),
    createHeading("Anbefalinger"),
    ...createBulletList(buildRecommendations(measurements, thresholds)),
    ...(noiseMeta.recommendationsExtraText.trim()
      ? createParagraphsFromText(noiseMeta.recommendationsExtraText.trim())
      : []),
    createHeading("Referanser"),
    ...createBulletList([
      "Arbeidstilsynets informasjonsside om støy.",
      "Arbeidsmiljøloven § 4-4. Krav til det fysiske arbeidsmiljøet.",
      "Arbeidsplassforskriften § 2-16. Støy og vibrasjoner.",
      "Forskrift om utførelse av arbeid § 14 Arbeid som kan medføre eksponering for støy eller mekaniske vibrasjoner.",
      "Forskrift om tekniske krav til byggverk (TEK17).",
      "Forskrift om tiltaks- og grenseverdier § 2 Støy.",
    ]),
    ...(noiseMeta.referencesText.trim()
      ? createBulletList(
          noiseMeta.referencesText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        )
      : []),
    ...(noiseMeta.referencesExtraText.trim() ? createParagraphsFromText(noiseMeta.referencesExtraText.trim()) : []),
    createHeading("Vedlegg"),
    ...(state.files.length > 0
      ? createBulletList(state.files.map((file, index) => `Vedlegg ${index + 1} - ${file.name}`))
      : [createBodyParagraph("Ingen vedlegg er lagt til.")]),
    ...(noiseMeta.appendicesExtraText.trim() ? createParagraphsFromText(noiseMeta.appendicesExtraText.trim()) : []),
  ];

  return createWordDocument(children);
}

export async function generateNoiseReportWordBlob(state: ReportState): Promise<Blob> {
  const doc = createNoiseReportWordDoc(state);
  return await packWordDocumentToBlob(doc);
}

export async function generateNoiseReportWord(state: ReportState): Promise<void> {
  const blob = await generateNoiseReportWordBlob(state);
  const baseName = sanitizeFileNameSegment(state.client.name || "Kunde", "Kunde");
  downloadBlob(blob, `Stoyrapport_${baseName}.docx`);
}
