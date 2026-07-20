import { buildStoragePath, type UploadOptions, type UploadResult } from "@/services/storage";

/** Read a File into a base64 data URL (viewable/downloadable with no server). */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Mock storage: keep the file inline as a data URL so the demo works offline. */
export async function uploadToDataUrl(file: File, options: UploadOptions): Promise<UploadResult> {
  const url = await readAsDataUrl(file);
  return {
    url,
    path: buildStoragePath(options.folder, file.name),
    name: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
