import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { brokersApi, type BrokerFilters } from "@/services/api/brokers";
import type { ID } from "@/types/common";

export function useBrokers(filters?: BrokerFilters) {
  return useQuery({
    queryKey: queryKeys.brokers.list(filters),
    queryFn: () => brokersApi.list(filters),
  });
}

export function useBroker(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.brokers.detail(id ?? ""),
    queryFn: () => brokersApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useBrokerLeaderboard() {
  return useQuery({
    queryKey: queryKeys.brokers.leaderboard,
    queryFn: () => brokersApi.leaderboard(),
  });
}
