import { useMemo, useRef, useState } from "react";
import { Download, FileText, FolderOpen, Search, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/services/hooks/use-documents";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { uploadFile, ACCEPTED_UPLOAD_TYPES } from "@/services/storage";
import { formatDate } from "@/lib/format";
import { DOCUMENT_KIND_LABELS, DocumentKind } from "@/types/document";
import { useDocumentMeta } from "@/hooks/use-document-meta";

function inferKind(name: string): DocumentKind {
  const n = name.toLowerCase();
  if (n.includes("rate")) return DocumentKind.RateConfirmation;
  if (n.includes("bol")) return DocumentKind.Bol;
  if (n.includes("pod")) return DocumentKind.Pod;
  if (n.includes("invoice")) return DocumentKind.Invoice;
  if (/\.(png|jpg|jpeg|webp)$/.test(n)) return DocumentKind.Screenshot;
  if (n.endsWith(".pdf")) return DocumentKind.Pdf;
  return DocumentKind.Other;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  useDocumentMeta({ title: "Documents · Detention Recover AI" });
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const debounced = useDebounce(search);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: docs, isLoading } = useDocuments(
    useMemo(() => ({ search: debounced, kind: kind as DocumentKind | "all" }), [debounced, kind]),
  );
  const upload = useUploadDocument();
  const remove = useDeleteDocument();

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let done = 0;
    try {
      for (const file of Array.from(files)) {
        const stored = await uploadFile(file, { folder: "documents" });
        await upload.mutateAsync({
          kind: inferKind(file.name),
          name: stored.name,
          contentType: stored.contentType,
          sizeBytes: stored.sizeBytes,
          url: stored.url,
        });
        done += 1;
      }
      toast.success(`${done} file${done > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error("Upload failed", err instanceof Error ? err.message : undefined);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Rate confirmations, BOLs, PODs, invoices, and evidence — searchable and organized."
        actions={
          <Button onClick={() => fileInput.current?.click()} loading={upload.isPending}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPTED_UPLOAD_TYPES}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" className="sm:max-w-xs" />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !docs || docs.length === 0 ? (
        <EmptyState
          icon={search ? Search : FolderOpen}
          title={search ? "No matching documents" : "No documents yet"}
          description={search ? "Try a different search." : "Upload rate confirmations, BOLs, and PODs to build your evidence library."}
          action={!search ? <Button onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" /> Upload</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}</p>
                  </div>
                </div>
                {doc.aiSummary && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{doc.aiSummary}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="muted">{DOCUMENT_KIND_LABELS[doc.kind]}</Badge>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" aria-label="Download" asChild>
                      <a href={doc.url} download={doc.name}><Download className="h-4 w-4" /></a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => remove.mutateAsync(doc.id).then(() => toast.success("Document removed"))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
