import { randomUUID } from "node:crypto";
import type { ReportState, ReportType } from "@/lib/reports/template-types";
import { getDbPool } from "@/lib/db";
import { defaultNoiseData } from "@/lib/reports/templates/noise/schema";
import { defaultIndoorClimateData } from "@/lib/reports/templates/indoor-climate/schema";

export interface SessionIdentity {
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface ReportDraftSummary {
  id: string;
  reportType: string;
  assignment: string;
  clientName: string;
  clientOrgNr: string;
  currentStep: number;
  status: string;
  updatedAt: string;
  createdAt: string;
}

export interface ReportDraftRecord extends ReportDraftSummary {
  reportState: ReportState;
}

let schemaReadyPromise: Promise<void> | null = null;

function sanitizeReportStateForStorage(state: ReportState): ReportState {
  return {
    ...state,
    files: [],
  };
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T;
  }

  if (base && typeof base === "object") {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    const overrideRecord = override && typeof override === "object" ? (override as Record<string, unknown>) : {};

    for (const [key, baseValue] of Object.entries(result)) {
      result[key] = deepMerge(baseValue, overrideRecord[key]);
    }

    for (const [key, overrideValue] of Object.entries(overrideRecord)) {
      if (!(key in result)) {
        result[key] = overrideValue;
      }
    }

    return result as T;
  }

  return (override ?? base) as T;
}

function getDefaultTemplateData(reportType: ReportType | ""): ReportState["data"] {
  switch (reportType) {
    case "noise":
      return { type: "noise", noise: defaultNoiseData };
    case "indoor-climate":
      return { type: "indoor-climate", indoorClimate: defaultIndoorClimateData };
    case "chemical":
      return { type: "chemical", chemical: {} };
    case "light":
      return { type: "light", light: {} };
    default:
      return null;
  }
}

function coerceStoredReportState(raw: unknown): ReportState {
  const state = raw as Partial<ReportState>;
  const reportType = (state.reportType ?? "") as ReportState["reportType"];
  const defaultState: ReportState = {
    client: { orgNr: "", name: "", address: "", industry: "" },
    step: 1,
    reportType,
    sharedMetadata: {
      assignment: "",
      date: new Date().toISOString().split("T")[0],
      participants: "",
      contactPerson: "",
      author: "",
      reportDate: new Date().toISOString().split("T")[0],
      reportSentTo: "",
      advisor: "",
    },
    files: [],
    weather: {
      include: true,
      location: "",
      date: new Date().toISOString().split("T")[0],
      data: null,
    },
    data: getDefaultTemplateData(reportType),
  };

  const merged = deepMerge(defaultState, state);
  return { ...merged, files: [] };
}

async function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const pool = await getDbPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT,
          image_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS report_drafts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'draft',
          report_type TEXT NOT NULL,
          assignment TEXT NOT NULL DEFAULT '',
          client_org_nr TEXT NOT NULL DEFAULT '',
          client_name TEXT NOT NULL DEFAULT '',
          current_step INTEGER NOT NULL DEFAULT 1,
          report_state_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_opened_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS report_drafts_user_updated_idx
          ON report_drafts (user_id, updated_at DESC);
      `);
    })();
  }

  await schemaReadyPromise;
}

async function ensureUser(identity: SessionIdentity): Promise<{ id: string; email: string }> {
  await ensureSchema();
  const pool = await getDbPool();

  const existing = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM app_users WHERE email = $1`,
    [identity.email]
  );

  if (existing.rowCount && existing.rows[0]) {
    const row = existing.rows[0];
    await pool.query(
      `UPDATE app_users
       SET name = $2,
           image_url = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, identity.name ?? null, identity.image ?? null]
    );
    return row;
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO app_users (id, email, name, image_url)
     VALUES ($1, $2, $3, $4)`,
    [id, identity.email, identity.name ?? null, identity.image ?? null]
  );

  return { id, email: identity.email };
}

function mapDraftRow(row: Record<string, unknown>): ReportDraftSummary {
  return {
    id: String(row.id),
    reportType: String(row.report_type),
    assignment: String(row.assignment ?? ""),
    clientName: String(row.client_name ?? ""),
    clientOrgNr: String(row.client_org_nr ?? ""),
    currentStep: Number(row.current_step ?? 1),
    status: String(row.status ?? "draft"),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listDraftsForUser(identity: SessionIdentity): Promise<ReportDraftSummary[]> {
  const user = await ensureUser(identity);
  const pool = await getDbPool();

  const result = await pool.query(
    `SELECT id, report_type, assignment, client_name, client_org_nr, current_step, status, updated_at, created_at
     FROM report_drafts
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [user.id]
  );

  return result.rows.map((row) => mapDraftRow(row));
}

export async function getDraftForUser(identity: SessionIdentity, draftId: string): Promise<ReportDraftRecord | null> {
  const user = await ensureUser(identity);
  const pool = await getDbPool();

  const result = await pool.query(
    `SELECT id, report_type, assignment, client_name, client_org_nr, current_step, status, updated_at, created_at, report_state_json
     FROM report_drafts
     WHERE id = $1 AND user_id = $2`,
    [draftId, user.id]
  );

  const row = result.rows[0];
  if (!row) return null;

  await pool.query(
    `UPDATE report_drafts SET last_opened_at = NOW() WHERE id = $1 AND user_id = $2`,
    [draftId, user.id]
  );

  return {
    ...mapDraftRow(row),
    reportState: coerceStoredReportState(row.report_state_json),
  };
}

export async function createDraftForUser(
  identity: SessionIdentity,
  reportState: ReportState
): Promise<ReportDraftRecord> {
  const user = await ensureUser(identity);
  const pool = await getDbPool();
  const id = randomUUID();
  const sanitized = sanitizeReportStateForStorage(reportState);

  await pool.query(
    `INSERT INTO report_drafts (
      id,
      user_id,
      report_type,
      assignment,
      client_org_nr,
      client_name,
      current_step,
      report_state_json,
      last_opened_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
    [
      id,
      user.id,
      sanitized.reportType || "",
      sanitized.sharedMetadata.assignment || "",
      sanitized.client.orgNr || "",
      sanitized.client.name || "",
      sanitized.step || 1,
      JSON.stringify(sanitized),
    ]
  );

  const draft = await getDraftForUser(identity, id);
  if (!draft) {
    throw new Error("Failed to load created draft.");
  }

  return draft;
}

export async function updateDraftForUser(
  identity: SessionIdentity,
  draftId: string,
  reportState: ReportState
): Promise<ReportDraftRecord | null> {
  const user = await ensureUser(identity);
  const pool = await getDbPool();
  const sanitized = sanitizeReportStateForStorage(reportState);

  const result = await pool.query(
    `UPDATE report_drafts
     SET report_type = $3,
         assignment = $4,
         client_org_nr = $5,
         client_name = $6,
         current_step = $7,
         report_state_json = $8::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [
      draftId,
      user.id,
      sanitized.reportType || "",
      sanitized.sharedMetadata.assignment || "",
      sanitized.client.orgNr || "",
      sanitized.client.name || "",
      sanitized.step || 1,
      JSON.stringify(sanitized),
    ]
  );

  if (result.rowCount === 0) return null;
  return getDraftForUser(identity, draftId);
}
