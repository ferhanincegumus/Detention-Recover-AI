import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { leadsApi, type LeadFilters } from "@/services/api/leads";
import type { ID } from "@/types/common";
import type { LeadStatus } from "@/types/lead";

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => leadsApi.list(filters),
  });
}

export function useLead(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id ?? ""),
    queryFn: () => leadsApi.get(id!),
    enabled: Boolean(id),
  });
}

function useLeadInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    qc.invalidateQueries({ queryKey: queryKeys.activity.all });
  };
}

export function useSetLeadStatus() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: ({ id, status }: { id: ID; status: LeadStatus }) => leadsApi.setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useAddLeadNote() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: ID; body: string }) => leadsApi.addNote(id, body),
    onSuccess: invalidate,
  });
}

export function useSetLeadTags() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: ({ id, tags }: { id: ID; tags: string[] }) => leadsApi.setTags(id, tags),
    onSuccess: invalidate,
  });
}

export function useStartRecovery() {
  const invalidate = useLeadInvalidation();
  return useMutation({
    mutationFn: (id: ID) => leadsApi.startRecovery(id),
    onSuccess: invalidate,
  });
}
