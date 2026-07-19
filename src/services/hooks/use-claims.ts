import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { claimsApi, type ClaimFilters } from "@/services/api/claims";
import type { Claim, ClaimStatus } from "@/types/claim";
import type { ID } from "@/types/common";

export function useClaims(filters?: ClaimFilters) {
  return useQuery({
    queryKey: queryKeys.claims.list(filters),
    queryFn: () => claimsApi.list(filters),
  });
}

export function useClaim(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.claims.detail(id ?? ""),
    queryFn: () => claimsApi.get(id!),
    enabled: Boolean(id),
  });
}

function useClaimInvalidation() {
  const qc = useQueryClient();
  return (claim?: Claim) => {
    qc.invalidateQueries({ queryKey: queryKeys.claims.all });
    qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard });
    qc.invalidateQueries({ queryKey: queryKeys.activity.all });
    qc.invalidateQueries({ queryKey: queryKeys.followups.all });
    if (claim) qc.invalidateQueries({ queryKey: queryKeys.brokers.all });
  };
}

export function useSetClaimStatus() {
  const invalidate = useClaimInvalidation();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: ID; status: ClaimStatus; note?: string }) =>
      claimsApi.setStatus(id, status, note),
    onSuccess: (claim) => invalidate(claim),
  });
}

export function useMarkClaimPaid() {
  const invalidate = useClaimInvalidation();
  return useMutation({
    mutationFn: ({ id, amount }: { id: ID; amount: number }) => claimsApi.markPaid(id, amount),
    onSuccess: (claim) => invalidate(claim),
  });
}

export function useUpdateClaim() {
  const invalidate = useClaimInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: ID; patch: Partial<Claim> }) => claimsApi.update(id, patch),
    onSuccess: (claim) => invalidate(claim),
  });
}
