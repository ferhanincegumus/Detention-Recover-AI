import { QueryClient } from "@tanstack/react-query";

/** Shared React Query client with production-sensible defaults. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Centralized query keys. Keeping these in one factory avoids typo-driven
 * cache misses and makes invalidation predictable across features.
 */
export const queryKeys = {
  loads: {
    all: ["loads"] as const,
    list: (filters?: unknown) => ["loads", "list", filters] as const,
    detail: (id: string) => ["loads", "detail", id] as const,
  },
  claims: {
    all: ["claims"] as const,
    list: (filters?: unknown) => ["claims", "list", filters] as const,
    detail: (id: string) => ["claims", "detail", id] as const,
  },
  leads: {
    all: ["leads"] as const,
    list: (filters?: unknown) => ["leads", "list", filters] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
  },
  brokers: {
    all: ["brokers"] as const,
    list: (filters?: unknown) => ["brokers", "list", filters] as const,
    detail: (id: string) => ["brokers", "detail", id] as const,
    leaderboard: ["brokers", "leaderboard"] as const,
  },
  followups: {
    all: ["followups"] as const,
    list: (filters?: unknown) => ["followups", "list", filters] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: (filters?: unknown) => ["documents", "list", filters] as const,
  },
  inbox: {
    all: ["inbox"] as const,
    list: (filters?: unknown) => ["inbox", "list", filters] as const,
  },
  activity: {
    all: ["activity"] as const,
    recent: ["activity", "recent"] as const,
  },
  analytics: {
    dashboard: ["analytics", "dashboard"] as const,
    revenue: (range: string) => ["analytics", "revenue", range] as const,
  },
} as const;
