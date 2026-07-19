import type { BaseEntity, ID, ISODate } from "@/types/common";

export const FollowUpCadence = {
  Day7: "day_7",
  Day14: "day_14",
  Day30: "day_30",
  Custom: "custom",
} as const;
export type FollowUpCadence = (typeof FollowUpCadence)[keyof typeof FollowUpCadence];

export const FOLLOWUP_CADENCE_DAYS: Record<Exclude<FollowUpCadence, "custom">, number> = {
  [FollowUpCadence.Day7]: 7,
  [FollowUpCadence.Day14]: 14,
  [FollowUpCadence.Day30]: 30,
};

export const FollowUpStatus = {
  Scheduled: "scheduled",
  Sent: "sent",
  Paused: "paused",
  Cancelled: "cancelled",
} as const;
export type FollowUpStatus = (typeof FollowUpStatus)[keyof typeof FollowUpStatus];

export const FOLLOWUP_STATUS_META: Record<
  FollowUpStatus,
  { label: string; tone: "muted" | "primary" | "success" | "destructive" | "warning" }
> = {
  [FollowUpStatus.Scheduled]: { label: "Scheduled", tone: "primary" },
  [FollowUpStatus.Sent]: { label: "Sent", tone: "success" },
  [FollowUpStatus.Paused]: { label: "Paused", tone: "warning" },
  [FollowUpStatus.Cancelled]: { label: "Cancelled", tone: "muted" },
};

export interface FollowUp extends BaseEntity {
  claimId: ID;
  claimNumber: string;
  brokerName: string;
  cadence: FollowUpCadence;
  status: FollowUpStatus;
  scheduledFor: ISODate;
  sentAt?: ISODate | null;
  /** Sequence position (1st, 2nd, 3rd follow-up). */
  sequence: number;
  /** AI-drafted follow-up message body. */
  draftMessage?: string;
}
