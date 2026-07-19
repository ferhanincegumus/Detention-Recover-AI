import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { loadsApi, type LoadFilters, type LoadInput } from "@/services/api/loads";
import type { ID } from "@/types/common";

export function useLoads(filters?: LoadFilters) {
  return useQuery({
    queryKey: queryKeys.loads.list(filters),
    queryFn: () => loadsApi.list(filters),
  });
}

export function useLoad(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.loads.detail(id ?? ""),
    queryFn: () => loadsApi.get(id!),
    enabled: Boolean(id),
  });
}

function useLoadInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.loads.all });
    qc.invalidateQueries({ queryKey: queryKeys.activity.all });
  };
}

export function useCreateLoad() {
  const invalidate = useLoadInvalidation();
  return useMutation({
    mutationFn: (input: LoadInput) => loadsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateLoad() {
  const invalidate = useLoadInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: ID; input: LoadInput }) => loadsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLoad() {
  const invalidate = useLoadInvalidation();
  return useMutation({
    mutationFn: (id: ID) => loadsApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useCreateClaimFromLoad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loadId: ID) => loadsApi.createClaim(loadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.loads.all });
      qc.invalidateQueries({ queryKey: queryKeys.claims.all });
      qc.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}
