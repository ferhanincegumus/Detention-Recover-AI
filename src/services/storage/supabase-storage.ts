import { getSupabase } from "@/services/supabase/client";
import { buildStoragePath, type UploadOptions, type UploadResult } from "@/services/storage";

/**
 * Supabase Storage upload. Buckets are created by the 0002_storage.sql
 * migration: "documents" (admin) and "lead-uploads" (public landing proof),
 * both public-read with unguessable UUID paths.
 */
export async function uploadToSupabase(file: File, options: UploadOptions): Promise<UploadResult> {
  const supabase = getSupabase();
  const bucket = options.folder;
  const path = buildStoragePath(options.folder, file.name).slice(options.folder.length + 1);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    url: data.publicUrl,
    path: `${bucket}/${path}`,
    name: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
