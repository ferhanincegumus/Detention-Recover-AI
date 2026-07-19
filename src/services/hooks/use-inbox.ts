import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { inboxApi } from "@/services/api/inbox";
import type { ID } from "@/types/common";

export function useInbox() {
  return useQuery({
    queryKey: queryKeys.inbox.list(),
    queryFn: () => inboxApi.list(),
  });
}

export function useMarkInboxRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => inboxApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all });
      qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard });
    },
  });
}

export function useScanInbox() {
  return useMutation({
    mutationFn: () => inboxApi.scan(),
  });
}
