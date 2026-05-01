# YH Auto-Reporter

Rapportverktøy for yrkeshygienikere i Dr. Dropin Bedrift. Automatiserer rapportskriving for HMS-kartlegginger ved å fylle inn data, generere tekst med AI, og produsere profesjonelle PDF-rapporter.

**Codeowner:** victor.uhnger@drdropin.no

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui (Radix UI)
- **Auth:** NextAuth med Google OAuth, domenerestriksjon
- **AI:** Google Gemini API (streaming tekstgenerering)
- **Google Sheets:** Utstyrsoversikt via service account
- **Database:** PostgreSQL i Cloud SQL (lagrede rapportutkast per bruker)
- **Storage:** Google Cloud Storage (vedlegg for rapportutkast)
- **PDF:** jsPDF + jspdf-autotable
- **Ikoner:** Lucide React

## Rapporttyper

| Type | Status |
|------|--------|
| Støy | Implementert |
| Inneklima | Implementert |
| Kjemisk helsefare | Placeholder |
| Belysning | Placeholder |

## Kom i gang

### 1. Klon og installer

```bash
git clone <repo-url>
cd yh
npm install
```

### 2. Sett opp miljøvariabler

Kopier `.env.local.example` til `.env.local` og fyll inn verdiene:

```bash
cp .env.local.example .env.local
```

| Variabel | Beskrivelse |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID for innlogging |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `NEXTAUTH_SECRET` | Tilfeldig secret for NextAuth-sessions |
| `NEXTAUTH_URL` | App-URL (http://localhost:3000 lokalt) |
| `GOOGLE_ALLOWED_DOMAIN` | Domenerestriksjon for innlogging (f.eks. `drdropin.no` eller `@drdropin.no`) |
| `GEMINI_API_KEY` | API-nøkkel for Google Gemini |
| `GEMINI_MODEL` | Gemini-modell (standard: `gemini-3-flash-preview`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON for Sheets-tilgang |
| `GOOGLE_SHEETS_ID` | Spreadsheet-ID for utstyrsoversikten |
| `GOOGLE_SHEETS_GID` | GID for det spesifikke arket |
| `MET_FROST_CLIENT_ID` | Client ID for Frost API (met.no) til historiske værdata |
| `DB_INSTANCE_CONNECTION_NAME` | Cloud SQL connection name (`project:region:instance`) |
| `DB_NAME` | Postgres-database for rapportutkast |
| `DB_USER` | Databasebruker for appen |
| `DB_PASSWORD` | Passord for databasebrukeren |
| `GOOGLE_CLOUD_APP_CREDENTIALS_JSON` | Service account JSON for Cloud SQL- og GCS-tilgang |
| `GCS_REPORT_ATTACHMENTS_BUCKET` | Bucket-navn for vedlegg til rapportutkast |

### 3. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Secrets

Alle secrets ligger i **1Password** under vaultet **bht-vertexai-production**.

Dette inkluderer Google OAuth-credentials, NextAuth secret, Gemini API-nøkkel, service account JSON for Google Sheets, Cloud SQL/GCS-credentials og databasepassord.

## Etter nøkkelrotasjon

Prosjektet trenger disse Google-verdiene på nytt:

- `GOOGLE_CLIENT_ID` og `GOOGLE_CLIENT_SECRET` for NextAuth Google-innlogging
- `GEMINI_API_KEY` for `/api/ai-fill`
- `GOOGLE_SERVICE_ACCOUNT_JSON` for `/api/instruments`

Faste verdier som fortsatt brukes av appen:

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SHEETS_GID`
- `GOOGLE_ALLOWED_DOMAIN` kan settes til enten `drdropin.no` eller `@drdropin.no`

Se 1Password-entryen `yh-reporting Google Sheets` for korrekt `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_GID` og service account-detaljer.
Google Sheet-en må deles med service account-en fra den secret-managed entryen, ellers vil `/api/instruments` feile selv om `.env.local` er korrekt.

## Prosjektstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── ai-fill/              # AI-tekstgenerering (streaming)
│   │   ├── auth/[...nextauth]/   # NextAuth API-rute
│   │   ├── instruments/          # Utstyrsoversikt fra Google Sheets
│   │   ├── reports/              # Lagring, lasting og vedlegg for rapportutkast
│   │   └── weather/              # Værdata via geokoding + met.no Frost
│   ├── auth/signin/              # Innloggingsside
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Hovedside (wizard)
│   └── reports/                  # Liste og resume av lagrede utkast
├── components/
│   ├── layout/                   # Header med auth
│   ├── reports/                  # Listevisning for lagrede utkast
│   ├── ui/                       # shadcn/ui-komponenter
│   └── wizard/                   # Rapportveiviser
│       ├── wizard-context.tsx    # Global state for wizard
│       ├── report-wizard.tsx     # Hovedkomponent
│       ├── instrument-selector.tsx # Utstyrstabell
│       ├── ai-fill-button.tsx    # AI-genereringsknapp
│       └── pdf-preview.tsx       # Live PDF-forhåndsvisning
└── lib/
    ├── auth.ts                   # NextAuth-konfigurasjon
    ├── db.ts                     # Cloud SQL-tilkobling
    ├── google-sheets.ts          # Google Sheets-klient
    ├── report-drafts.ts          # Repository for utkast og vedlegg
    ├── session-identity.ts       # Mapping fra NextAuth-session til lokal brukeridentitet
    ├── storage.ts                # GCS-opplasting/sletting for vedlegg
    └── reports/
        ├── template-types.ts     # Felles typer
        ├── template-registry.ts  # Mal-register
        └── templates/
            ├── noise/            # Støyrapport
            │   ├── schema.ts     # Typer og defaults
            │   ├── sample.ts     # Eksempeldata
            │   ├── pdf.ts        # PDF-generering
            │   ├── ai.ts         # AI-kontekst og felter
            │   └── steps/        # Wizard-steg
            └── indoor-climate/   # Inneklimarapport
```

## Arkitektur

### Template-system
Hver rapporttype implementerer `ReportTemplate`-interfacet og registreres i template-registeret. En mal definerer:
- **Schema** — typer, defaults, valideringslogikk
- **Steps** — wizard-steg (React-komponenter)
- **PDF** — PDF-generering med jsPDF
- **AI** — feltkonfigurasjon og kontekstbygging for Gemini
- **Sample** — eksempeldata for utvikling/testing

### Wizard-flyt
1. Velg rapporttype
2. Fyll inn kundeinformasjon
3. Fyll inn felles metadata (oppdrag, dato, deltakere)
4. Rapportspesifikke steg (f.eks. målinger, utstyr, tekster)
5. Lagre utkast / autosave (Cloud SQL)
6. Last opp vedlegg (GCS)
7. Gjennomgang med live PDF-forhåndsvisning
8. Eksport (PDF-nedlasting)

### Lagring av rapportutkast
- Utkast lagres per innlogget bruker i Cloud SQL.
- Listen over utkast finnes på `/reports`.
- Åpning av et utkast skjer via `/reports/[id]`.
- Utkast autosaves når rapporten har tilstrekkelig innhold.
- Vedlegg lagres i GCS og kobles til utkastet i databasen.
- Vedlegg vises i PDF som vedleggsnavn, ikke som nedlastbare binærvedlegg i selve PDF-filen.

### GCP-oppsett for lagring
Følgende ressurser brukes i `bht-vertexai-production`:

- Cloud SQL instance: `pitch-generator-db-postgres`
- Database: `yh_reporting`
- App-bruker i Postgres: `yh_reporting_app`
- GCS bucket: `yh-reporting-attachments-bht-vertexai-production`
- Service account for app-tilgang: `yh-reporting-db-client@bht-vertexai-production.iam.gserviceaccount.com`

Service account-en trenger minst:

- `roles/cloudsql.client`
- `roles/storage.objectAdmin` på attachment-bucketen

Applikasjonen bruker Cloud SQL Node.js Connector, så det er ikke nødvendig å åpne opp Vercels egress-IP-er i Cloud SQL.

### Google Sheets-integrasjon
Utstyrsoversikten hentes fra et Google Sheet via service account. API-ruten (`/api/instruments`) cacher resultatet i 5 minutter. Brukes for å velge måleinstrumenter, kalibratorer, etc. i rapportene.

### AI-tekstgenerering
Gemini API brukes til å generere felttekster basert på rapportdata. Hver mal definerer hvilke felter som støtter AI-generering, med spesifikk veiledning og kontekst. Responsen streames direkte til klienten.

## Scripts

```bash
npm run dev       # Utviklingsserver
npm run build     # Produksjonsbuild
npm run start     # Produksjonsserver
npm run lint      # Kjør ESLint
```

## CI/CD

GitHub Actions-workflow (`.github/workflows/sync-to-dropin.yaml`) synkroniserer `main`-branchen til work-repoet ved push. Krever `WORK_REPO_TOKEN` som GitHub secret.
