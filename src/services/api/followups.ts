import { getDb, mutate } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { withLatency } from "@/services/api/helpers";
import { uid } from "@/lib/utils";
import { addDays } from "date-fns";
import type { ID } from "@/types/common";
import {
  FOLLOWUP_CADENCE_DAYS,
  FollowUpCadence,
  FollowUpStatus,
  type FollowUp,
} from "@/types/followup";
import { ActivityType } from "@/types/communication";
import { logActivity } from "@/services/api/activity";

export interface FollowUpFilters {
  status?: FollowUpStatus | "all";
  claimId?: string;
}

export const followupsApi = {
  async list(filters?: FollowUpFilters): Promise<FollowUp[]> {
    const items = getDb()
      .followups.filter((f) => {
        if (filters?.status && filters.status !== "all" && f.status !== filters.status) return false;
        if (filters?.claimId && f.claimId !== filters.claimId) return false;
        return true;
      })
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    return withLatency(items);
  },

  async schedule(input: {
    claimId: ID;
    claimNumber: string;
    brokerName: string;
    cadence: FollowUpCadence;
    customDays?: number;
    sequence?: number;
  }): Promise<FollowUp> {
    return withLatency(
      mutate((db) => {
        const days =
          input.cadence === FollowUpCadence.Custom
            ? input.customDays ?? 7
            : FOLLOWUP_CADENCE_DAYS[input.cadence];
        const nowIso = new Date().toISOString();
        const followup: FollowUp = {
          id: uid("fu"),
          claimId: input.claimId,
          claimNumber: input.claimNumber,
          brokerName: input.brokerName,
          cadence: input.cadence,
          status: FollowUpStatus.Scheduled,
          scheduledFor: addDays(new Date(), days).toISOString(),
          sentAt: null,
          sequence: input.sequence ?? 1,
          createdAt: nowIso,
          updatedAt: nowIso,
          ownerId: OWNER_ID,
        };
        db.followups = [followup, ...db.followups];
        return followup;
      }),
    );
  },

  async setStatus(id: ID, status: FollowUpStatus): Promise<FollowUp> {
    return withLatency(
      mutate((db) => {
        const followup = db.followups.find((f) => f.id === id);
        if (!followup) throw new Error(`Follow-up ${id} not found`);
        followup.status = status;
        followup.updatedAt = new Date().toISOString();
        if (status === FollowUpStatus.Sent) {
          followup.sentAt = followup.updatedAt;
          logActivity(db, {
            type: ActivityType.FollowUpSent,
            title: `Follow-up sent to ${followup.brokerName}`,
            description: `Claim ${followup.claimNumber}`,
            claimId: followup.claimId,
            automated: false,
          });
        }
        return followup;
      }),
    );
  },
};
