import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { analyticsApi } from "@/services/api/analytics";
import { activityApi } from "@/services/api/activity";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: () => analyticsApi.dashboard(),
  });
}

export function useMonthlyTrend(months = 6) {
  return useQuery({
    queryKey: [...queryKeys.analytics.revenue(`${months}m`)],
    queryFn: () => analyticsApi.monthlyTrend(months),
  });
}

export function useRecentActivity(limit = 12) {
  return useQuery({
    queryKey: [...queryKeys.activity.recent, limit],
    queryFn: () => activityApi.recent(limit),
  });
}

export function useAiRecommendations() {
  return useQuery({
    queryKey: ["analytics", "recommendations"],
    queryFn: () => analyticsApi.recommendations(),
  });
}

export function useBrokerRanking(limit = 5) {
  return useQuery({
    queryKey: ["analytics", "broker-ranking", limit],
    queryFn: () => analyticsApi.brokerRanking(limit),
  });
}

export function useCustomerRanking(limit = 5) {
  return useQuery({
    queryKey: ["analytics", "customer-ranking", limit],
    queryFn: () => analyticsApi.customerRanking(limit),
  });
}

export function useForecast() {
  return useQuery({
    queryKey: ["analytics", "forecast"],
    queryFn: () => analyticsApi.forecastNextMonth(),
  });
}
