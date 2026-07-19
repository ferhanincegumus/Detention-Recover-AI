import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/services/api/settings";
import type { AppSettings } from "@/types/user";

const SETTINGS_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => settingsApi.update(patch),
    onSuccess: (settings) => qc.setQueryData(SETTINGS_KEY, settings),
  });
}

export function useResetDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.resetDemoData(),
    onSuccess: () => qc.invalidateQueries(),
  });
}
