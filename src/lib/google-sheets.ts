import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const sheetsId = process.env.GOOGLE_SHEETS_ID;
const sheetsGid = process.env.GOOGLE_SHEETS_GID;

let serviceAccount: { client_email: string; private_key: string } | null = null;

if (!serviceAccountJson) {
  console.error("Missing GOOGLE_SERVICE_ACCOUNT_JSON in environment.");
} else {
  try {
    const parsed = JSON.parse(serviceAccountJson);
    if (
      parsed.type !== "service_account" ||
      !parsed.client_email ||
      !parsed.private_key
    ) {
      console.error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not a valid service account key."
      );
    } else {
      serviceAccount = parsed;
    }
  } catch {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

if (!sheetsId) {
  console.error("Missing GOOGLE_SHEETS_ID in environment.");
}

export const sheetsConfig = {
  sheetsId: sheetsId ?? "",
  gid: sheetsGid ?? "",
  get isConfigured() {
    return Boolean(serviceAccount && sheetsId);
  },
};

let clientInstance: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (clientInstance) return clientInstance;

  if (!serviceAccount) {
    throw new Error("Google Sheets service account is not configured.");
  }

  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  clientInstance = sheetsApi({ version: "v4", auth });
  return clientInstance;
}

const gidToNameCache = new Map<string, string>();

export async function resolveGidToSheetName(
  gid: string
): Promise<string | null> {
  const cached = gidToNameCache.get(gid);
  if (cached) return cached;

  const client = getSheetsClient();
  const res = await client.spreadsheets.get({
    spreadsheetId: sheetsConfig.sheetsId,
    fields: "sheets.properties(sheetId,title)",
  });

  const sheets = res.data.sheets ?? [];
  for (const sheet of sheets) {
    const props = sheet.properties;
    if (props?.sheetId !== undefined && props.title) {
      gidToNameCache.set(String(props.sheetId), props.title);
    }
  }

  return gidToNameCache.get(gid) ?? null;
}
