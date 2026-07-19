import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { documentsApi, type DocumentFilters, type DocumentInput } from "@/services/api/documents";
import type { ID } from "@/types/common";

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: () => documentsApi.list(filters),
  });
}

function useDocInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.documents.all });
    qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    qc.invalidateQueries({ queryKey: queryKeys.activity.all });
  };
}

export function useUploadDocument() {
  const invalidate = useDocInvalidation();
  return useMutation({
    mutationFn: (input: DocumentInput) => documentsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useDocInvalidation();
  return useMutation({
    mutationFn: (id: ID) => documentsApi.remove(id),
    onSuccess: invalidate,
  });
}
