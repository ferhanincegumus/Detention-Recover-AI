import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { followupsApi, type FollowUpFilters } from "@/services/api/followups";
import type { ID } from "@/types/common";
import type { FollowUpCadence, FollowUpStatus } from "@/types/followup";

export function useFollowups(filters?: FollowUpFilters) {
  return useQuery({
    queryKey: queryKeys.followups.list(filters),
    queryFn: () => followupsApi.list(filters),
  });
}

function useFollowupInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.followups.all });
    qc.invalidateQueries({ queryKey: queryKeys.activity.all });
    qc.invalidateQueries({ queryKey: queryKeys.analytics.dashboard });
  };
}

export function useScheduleFollowup() {
  const invalidate = useFollowupInvalidation();
  return useMutation({
    mutationFn: (input: {
      claimId: ID;
      claimNumber: string;
      brokerName: string;
      cadence: FollowUpCadence;
      customDays?: number;
      sequence?: number;
    }) => followupsApi.schedule(input),
    onSuccess: invalidate,
  });
}

export function useSetFollowupStatus() {
  const invalidate = useFollowupInvalidation();
  return useMutation({
    mutationFn: ({ id, status }: { id: ID; status: FollowUpStatus }) =>
      followupsApi.setStatus(id, status),
    onSuccess: invalidate,
  });
}
