import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";

let storageInstance: Storage | null = null;

function getCredentials() {
  const raw = process.env.GOOGLE_CLOUD_APP_CREDENTIALS_JSON?.trim() || process.env.GOOGLE_CLOUD_SQL_CREDENTIALS_JSON?.trim();
  if (!raw) {
    throw new Error("Missing GOOGLE_CLOUD_APP_CREDENTIALS_JSON or GOOGLE_CLOUD_SQL_CREDENTIALS_JSON");
  }
  return JSON.parse(raw);
}

function getBucketName() {
  const bucket = process.env.GCS_REPORT_ATTACHMENTS_BUCKET?.trim();
  if (!bucket) {
    throw new Error("Missing GCS_REPORT_ATTACHMENTS_BUCKET");
  }
  return bucket;
}

function getStorage() {
  if (!storageInstance) {
    storageInstance = new Storage({ credentials: getCredentials() });
  }
  return storageInstance;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "attachment";
}

export async function uploadDraftAttachment(params: {
  draftId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<{ storagePath: string }> {
  const bucket = getStorage().bucket(getBucketName());
  const objectName = `drafts/${params.draftId}/${randomUUID()}-${sanitizeFileName(params.fileName)}`;
  const file = bucket.file(objectName);
  await file.save(params.buffer, {
    contentType: params.contentType,
    resumable: false,
  });
  return { storagePath: objectName };
}

export async function deleteDraftAttachment(storagePath: string): Promise<void> {
  const bucket = getStorage().bucket(getBucketName());
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}
