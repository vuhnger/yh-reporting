import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import { Pool } from "pg";

let poolPromise: Promise<Pool> | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildGoogleAuth() {
  const credentialsJson = process.env.GOOGLE_CLOUD_SQL_CREDENTIALS_JSON?.trim();
  if (!credentialsJson) return undefined;

  return new GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ["https://www.googleapis.com/auth/sqlservice.admin"],
  });
}

async function createPool(): Promise<Pool> {
  const directUrl = process.env.DATABASE_URL?.trim();
  if (directUrl) {
    return new Pool({
      connectionString: directUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  const instanceConnectionName = getRequiredEnv("DB_INSTANCE_CONNECTION_NAME");
  const database = getRequiredEnv("DB_NAME");
  const user = getRequiredEnv("DB_USER");
  const password = getRequiredEnv("DB_PASSWORD");

  const connector = new Connector({
    auth: buildGoogleAuth(),
  });

  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  });

  return new Pool({
    ...clientOpts,
    user,
    password,
    database,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export async function getDbPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
}
