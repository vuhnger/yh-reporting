# YH Auto-Reporter

Rapportverktøy for yrkeshygienikere i Dr. Dropin Bedrift. Automatiserer rapportskriving for HMS-kartlegginger ved å fylle inn data, generere tekst med AI, og produsere profesjonelle PDF-rapporter.

**Codeowner:** victor.uhnger@drdropin.no

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui (Radix UI)
- **Auth:** NextAuth med Google OAuth, domenerestriksjon
- **AI:** Google Gemini API (streaming tekstgenerering)
- **Google Sheets:** Utstyrsoversikt via service account
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
| `GOOGLE_ALLOWED_DOMAIN` | Domenerestriksjon for innlogging (f.eks. `drdropin.no`) |
| `GEMINI_API_KEY` | API-nøkkel for Google Gemini |
| `GEMINI_MODEL` | Gemini-modell (standard: `gemini-3-flash-preview`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON for Sheets-tilgang |
| `GOOGLE_SHEETS_ID` | Spreadsheet-ID for utstyrsoversikten |
| `GOOGLE_SHEETS_GID` | GID for det spesifikke arket |
| `MET_FROST_CLIENT_ID` | Client ID for Frost API (met.no) til historiske værdata |

### 3. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Secrets

Alle secrets ligger i **1Password** under vaultet **bht-vertexai-production**.

Dette inkluderer Google OAuth-credentials, NextAuth secret, Gemini API-nøkkel og service account JSON for Google Sheets.

## Prosjektstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── ai-fill/              # AI-tekstgenerering (streaming)
│   │   ├── auth/[...nextauth]/   # NextAuth API-rute
│   │   ├── instruments/          # Utstyrsoversikt fra Google Sheets
│   │   └── weather/              # Værdata via geokoding + met.no Frost
│   ├── auth/signin/              # Innloggingsside
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Hovedside (wizard)
├── components/
│   ├── layout/                   # Header med auth
│   ├── ui/                       # shadcn/ui-komponenter
│   └── wizard/                   # Rapportveiviser
│       ├── wizard-context.tsx    # Global state for wizard
│       ├── report-wizard.tsx     # Hovedkomponent
│       ├── instrument-selector.tsx # Utstyrstabell
│       ├── ai-fill-button.tsx    # AI-genereringsknapp
│       └── pdf-preview.tsx       # Live PDF-forhåndsvisning
└── lib/
    ├── auth.ts                   # NextAuth-konfigurasjon
    ├── google-sheets.ts          # Google Sheets-klient
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
5. Gjennomgang med live PDF-forhåndsvisning
6. Eksport (PDF-nedlasting)

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
