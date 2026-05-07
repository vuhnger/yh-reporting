interface PortalUser {
  role?: unknown;
  advisorMakePlansID?: unknown;
}

interface PortalDivision {
  divisionType?: unknown;
  advisorMakePlansID?: unknown;
  advisorMakePlansId?: unknown;
  hmsContactId?: unknown;
  hms_contact_id?: unknown;
}

interface PortalOrganizationPayload {
  users?: unknown;
  makeplanBookingsPersonIds?: unknown;
  divisions?: unknown;
  advisorId?: unknown;
}

interface MakeplansResourceEnvelope {
  resource?: {
    title?: unknown;
  };
  title?: unknown;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;
const USER_ROLE_ALLOWLIST = new Set(["USER", "END_USER"]);

export interface AdvisorResolution {
  advisorId: string;
  advisorName: string;
  source:
    | "users.user-role"
    | "users.any"
    | "makeplanBookingsPersonIds"
    | "divisions.mother-company"
    | "advisorId";
}

const portalApiBaseUrl = (process.env.PORTALEN_API_BASE_URL || "").trim().replace(/\/$/, "");
const portalApiKey = (process.env.PORTALEN_API_KEY || "").trim();
const makeplansApiBaseUrl = (process.env.MAKEPLANS_API_BASE_URL || "").trim().replace(/\/$/, "");
const makeplansApiKey = (process.env.MAKEPLANS_API_KEY || "").trim();
const makeplansUserAgent = (process.env.MAKEPLANS_USER_AGENT || "yh").trim();

export const advisorConfig = {
  portalConfigured: Boolean(portalApiBaseUrl && portalApiKey),
  makeplansConfigured: Boolean(makeplansApiBaseUrl && makeplansApiKey),
};

function normalizeOrgNr(orgNr: string): string {
  return orgNr.replace(/\D/g, "");
}

function formatOrgNrWithSpaces(orgNr: string): string {
  const normalized = normalizeOrgNr(orgNr);
  if (normalized.length !== 9) return normalized;
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}

function getPortalOrgNrCandidates(orgNr: string): string[] {
  const raw = orgNr.trim();
  const normalized = normalizeOrgNr(orgNr);
  const formatted = formatOrgNrWithSpaces(orgNr);

  return [...new Set([raw, normalized, formatted].filter(Boolean))];
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function hasUserRole(role: unknown): boolean {
  if (typeof role === "string") {
    return USER_ROLE_ALLOWLIST.has(role.trim().toUpperCase());
  }

  if (Array.isArray(role)) {
    return role.some(
      (entry) => typeof entry === "string" && USER_ROLE_ALLOWLIST.has(entry.trim().toUpperCase())
    );
  }

  return false;
}

function getUsers(payload: PortalOrganizationPayload): PortalUser[] {
  return Array.isArray(payload.users) ? (payload.users as PortalUser[]) : [];
}

function getDivisions(payload: PortalOrganizationPayload): PortalDivision[] {
  return Array.isArray(payload.divisions) ? (payload.divisions as PortalDivision[]) : [];
}

export function extractAdvisorId(payload: PortalOrganizationPayload): AdvisorResolution | null {
  const users = getUsers(payload);

  for (const user of users) {
    if (!hasUserRole(user.role)) continue;
    const advisorId = toNonEmptyString(user.advisorMakePlansID);
    if (advisorId) {
      return { advisorId, advisorName: "", source: "users.user-role" };
    }
  }

  for (const user of users) {
    const advisorId = toNonEmptyString(user.advisorMakePlansID);
    if (advisorId) {
      return { advisorId, advisorName: "", source: "users.any" };
    }
  }

  if (Array.isArray(payload.makeplanBookingsPersonIds)) {
    for (const entry of payload.makeplanBookingsPersonIds) {
      const advisorId = toNonEmptyString(entry);
      if (advisorId) {
        return { advisorId, advisorName: "", source: "makeplanBookingsPersonIds" };
      }
    }
  }

  for (const division of getDivisions(payload)) {
    if (division.divisionType !== "MOTHER_COMPANY") continue;
    const advisorId =
      toNonEmptyString(division.advisorMakePlansID) ||
      toNonEmptyString(division.advisorMakePlansId) ||
      toNonEmptyString(division.hmsContactId) ||
      toNonEmptyString(division.hms_contact_id);

    if (advisorId) {
      return { advisorId, advisorName: "", source: "divisions.mother-company" };
    }
  }

  const advisorId = toNonEmptyString(payload.advisorId);
  if (advisorId) {
    return { advisorId, advisorName: "", source: "advisorId" };
  }

  return null;
}

export function extractAdvisorName(payload: MakeplansResourceEnvelope): string | null {
  return toNonEmptyString(payload.resource?.title) || toNonEmptyString(payload.title);
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new HttpError(response.status, body || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchPortalOrganization(orgNr: string): Promise<PortalOrganizationPayload> {
  if (!advisorConfig.portalConfigured) {
    throw new Error("Portalen API is not configured.");
  }

  let lastError: unknown = null;

  for (const candidate of getPortalOrgNrCandidates(orgNr)) {
    try {
      const url = `${portalApiBaseUrl}/api/integrations/organization?organizationNumber=${encodeURIComponent(candidate)}`;
      const payload = await fetchJson(url, {
        Authorization: `Bearer ${portalApiKey}`,
      });

      if (!payload || typeof payload !== "object") {
        throw new Error("Portalen svarte med ugyldig organisasjonsdata.");
      }

      return payload as PortalOrganizationPayload;
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpError) || error.status !== 404) {
        throw error;
      }
    }
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }

  throw new Error("Portalen svarte med ugyldig organisasjonsdata.");
}

async function fetchMakeplansResource(resourceId: string): Promise<MakeplansResourceEnvelope> {
  if (!advisorConfig.makeplansConfigured) {
    throw new Error("MakePlans API is not configured.");
  }

  const url = `${makeplansApiBaseUrl}/api/v1/resources/${encodeURIComponent(resourceId)}`;
  const payload = await fetchJson(url, {
    Authorization: `Bearer ${makeplansApiKey}`,
    "User-Agent": makeplansUserAgent,
  });

  if (!payload || typeof payload !== "object") {
    throw new Error("MakePlans svarte med ugyldig ressursdata.");
  }

  return payload as MakeplansResourceEnvelope;
}

export async function resolveAdvisorByOrgNr(orgNr: string): Promise<AdvisorResolution | null> {
  const normalizedOrgNr = normalizeOrgNr(orgNr);
  if (normalizedOrgNr.length !== 9) {
    return null;
  }

  let portalPayload: PortalOrganizationPayload;
  try {
    portalPayload = await fetchPortalOrganization(normalizedOrgNr);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  }

  const advisor = extractAdvisorId(portalPayload);
  if (!advisor) {
    return null;
  }

  const makeplansPayload = await fetchMakeplansResource(advisor.advisorId);
  const advisorName = extractAdvisorName(makeplansPayload);
  if (!advisorName) {
    console.error("Missing MakePlans advisor name", { advisorId: advisor.advisorId });
    throw new Error("Fant ikke navn for MakePlans-ressurs.");
  }

  return {
    ...advisor,
    advisorName,
  };
}
