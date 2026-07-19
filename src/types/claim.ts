import type { BaseEntity, ChargeType, ID, ISODate, USD } from "@/types/common";

/** Lifecycle of a recovery claim against a broker. */
export const ClaimStatus = {
  Draft: "draft",
  Sent: "sent",
  BrokerReplied: "broker_replied",
  Negotiating: "negotiating",
  SettlementOffered: "settlement_offered",
  Approved: "approved",
  Paid: "paid",
  Denied: "denied",
  Closed: "closed",
} as const;
export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  { label: string; tone: "muted" | "primary" | "success" | "destructive" | "warning"; order: number }
> = {
  [ClaimStatus.Draft]: { label: "Draft", tone: "muted", order: 0 },
  [ClaimStatus.Sent]: { label: "Sent", tone: "primary", order: 1 },
  [ClaimStatus.BrokerReplied]: { label: "Broker replied", tone: "warning", order: 2 },
  [ClaimStatus.Negotiating]: { label: "Negotiating", tone: "warning", order: 3 },
  [ClaimStatus.SettlementOffered]: { label: "Settlement offered", tone: "warning", order: 4 },
  [ClaimStatus.Approved]: { label: "Approved", tone: "success", order: 5 },
  [ClaimStatus.Paid]: { label: "Paid", tone: "success", order: 6 },
  [ClaimStatus.Denied]: { label: "Denied", tone: "destructive", order: 7 },
  [ClaimStatus.Closed]: { label: "Closed", tone: "muted", order: 8 },
};

/** Terminal statuses — no further automation runs. */
export const TERMINAL_CLAIM_STATUSES: ClaimStatus[] = [
  ClaimStatus.Paid,
  ClaimStatus.Denied,
  ClaimStatus.Closed,
];

export const OPEN_CLAIM_STATUSES: ClaimStatus[] = [
  ClaimStatus.Draft,
  ClaimStatus.Sent,
  ClaimStatus.BrokerReplied,
  ClaimStatus.Negotiating,
  ClaimStatus.SettlementOffered,
  ClaimStatus.Approved,
];

export interface ClaimTimelineEvent {
  id: ID;
  at: ISODate;
  status?: ClaimStatus;
  title: string;
  description?: string;
  /** Whether this event was performed by AI/automation vs. the founder. */
  automated: boolean;
}

export interface Claim extends BaseEntity {
  claimNumber: string;
  loadId: ID;
  loadReference: string;
  brokerId?: ID;
  brokerName: string;
  customerName?: string;
  customerPhone?: string;
  chargeType: ChargeType;
  status: ClaimStatus;
  /** Amount originally claimed. */
  claimedAmount: USD;
  /** Amount recovered (set when paid/settled). */
  recoveredAmount: USD;
  /** Latest settlement offer from the broker, if any. */
  settlementOffer?: USD | null;
  /** Our commission rate applied to recovered amount (0–1). */
  commissionRate: number;
  /** Computed commission = recoveredAmount * commissionRate. */
  commissionAmount: USD;
  /** Net paid to the carrier after commission. */
  carrierPayout: USD;
  sentAt?: ISODate | null;
  firstReplyAt?: ISODate | null;
  resolvedAt?: ISODate | null;
  paidAt?: ISODate | null;
  /** Days from sent → paid (computed on resolution). */
  daysToRecover?: number | null;
  /** 0–100 AI recovery-probability estimate. */
  recoveryProbability: number;
  /** AI predicted payment date. */
  predictedPaymentDate?: ISODate | null;
  timeline: ClaimTimelineEvent[];
  evidenceIds: ID[];
  /** Latest AI-drafted demand/claim letter body. */
  claimLetter?: string;
  tags: string[];
  notes?: string;
  /** True once archived by automation after resolution. */
  archived: boolean;
}
