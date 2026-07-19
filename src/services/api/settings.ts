import { getDb, mutate, resetDb } from "@/services/backend/store";
import { withLatency } from "@/services/api/helpers";
import type { AppSettings } from "@/types/user";

export const settingsApi = {
  async get(): Promise<AppSettings> {
    return withLatency(getDb().settings);
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    return withLatency(
      mutate((db) => {
        db.settings = { ...db.settings, ...patch };
        return db.settings;
      }),
    );
  },

  async resetDemoData(): Promise<void> {
    resetDb();
    return withLatency(undefined);
  },
};
