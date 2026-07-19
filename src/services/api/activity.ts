import { getDb } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { byDateDesc, withLatency } from "@/services/api/helpers";
import { uid } from "@/lib/utils";
import type { Database } from "@/services/backend/store";
import type { Activity, ActivityType } from "@/types/communication";

interface LogInput {
  type: ActivityType;
  title: string;
  description?: string;
  claimId?: string | null;
  loadId?: string | null;
  leadId?: string | null;
  brokerId?: string | null;
  automated: boolean;
}

/** Append an immutable audit-log entry. Called inside existing mutations. */
export function logActivity(db: Database, input: LogInput): Activity {
  const nowIso = new Date().toISOString();
  const entry: Activity = {
    id: uid("act"),
    type: input.type,
    title: input.title,
    description: input.description,
    claimId: input.claimId ?? null,
    loadId: input.loadId ?? null,
    leadId: input.leadId ?? null,
    brokerId: input.brokerId ?? null,
    automated: input.automated,
    createdAt: nowIso,
    updatedAt: nowIso,
    ownerId: OWNER_ID,
  };
  db.activities = [entry, ...db.activities];
  return entry;
}

export const activityApi = {
  async recent(limit = 15): Promise<Activity[]> {
    const items = [...getDb().activities].sort(byDateDesc((a) => a.createdAt)).slice(0, limit);
    return withLatency(items);
  },
};
