import { isSupabaseBackend } from "@/config/env";
import { uid } from "@/lib/utils";

/** Result of storing a file — a usable URL plus metadata for a document record. */
export interface UploadResult {
  url: string;
  path: string;
  name: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadOptions {
  /** Logical folder / bucket area, e.g. "documents" or "lead-uploads". */
  folder: string;
  /** Public (anon-readable) upload — used for landing-page proof. */
  isPublic?: boolean;
}

/** Max upload size. Mock mode is small (localStorage); Supabase allows more. */
export const MAX_UPLOAD_BYTES = isSupabaseBackend ? 15 * 1024 * 1024 : 3 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES =
  "application/pdf,image/png,image/jpeg,image/webp,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Build a collision-resistant storage path from a file name. */
export function buildStoragePath(folder: string, fileName: string): string {
  const safe = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return `${folder}/${uid("f")}-${safe}`;
}

export function assertUploadable(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    throw new Error(`"${file.name}" is too large (max ${mb} MB).`);
  }
}

/**
 * Store a file and return a usable URL. Uses Supabase Storage when the
 * Supabase backend is active, otherwise a local data-URL (works offline / in
 * the mock demo without any server).
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  assertUploadable(file);
  if (isSupabaseBackend) {
    const { uploadToSupabase } = await import("@/services/storage/supabase-storage");
    return uploadToSupabase(file, options);
  }
  const { uploadToDataUrl } = await import("@/services/storage/mock-storage");
  return uploadToDataUrl(file, options);
}
