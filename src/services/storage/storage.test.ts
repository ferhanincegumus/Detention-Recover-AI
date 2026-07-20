import { describe, it, expect } from "vitest";
import { buildStoragePath, assertUploadable, uploadFile, MAX_UPLOAD_BYTES } from "@/services/storage";

function makeFile(name: string, bytes: number, type = "application/pdf"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("buildStoragePath", () => {
  it("sanitizes the file name and namespaces by folder", () => {
    const path = buildStoragePath("documents", "Rate Con #123 (final).pdf");
    expect(path.startsWith("documents/")).toBe(true);
    expect(path).toMatch(/rate-con-123-final-.pdf$|rate-con-123-final.*\.pdf$/);
    expect(path).not.toContain(" ");
    expect(path).not.toContain("#");
  });

  it("keeps two calls distinct", () => {
    const a = buildStoragePath("x", "a.pdf");
    const b = buildStoragePath("x", "a.pdf");
    expect(a).not.toBe(b);
  });
});

describe("assertUploadable", () => {
  it("accepts a small file", () => {
    expect(() => assertUploadable(makeFile("a.pdf", 1000))).not.toThrow();
  });
  it("rejects an oversized file", () => {
    expect(() => assertUploadable(makeFile("big.pdf", MAX_UPLOAD_BYTES + 1))).toThrow(/too large/i);
  });
});

describe("uploadFile (mock backend)", () => {
  it("returns a data URL and file metadata", async () => {
    const result = await uploadFile(makeFile("bol.pdf", 128), { folder: "documents" });
    expect(result.url.startsWith("data:")).toBe(true);
    expect(result.name).toBe("bol.pdf");
    expect(result.contentType).toBe("application/pdf");
    expect(result.sizeBytes).toBe(128);
    expect(result.path.startsWith("documents/")).toBe(true);
  });
});
