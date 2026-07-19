import type { BaseEntity, ID, ISODate, USD } from "@/types/common";

export const LeadStatus = {
  New: "new",
  Reviewed: "reviewed",
  Contacted: "contacted",
  RecoveryStarted: "recovery_started",
  Recovered: "recovered",
  Rejected: "rejected",
  Lost: "lost",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; tone: "muted" | "primary" | "success" | "destructive" | "warning"; order: number }
> = {
  [LeadStatus.New]: { label: "New", tone: "primary", order: 0 },
  [LeadStatus.Reviewed]: { label: "Reviewed", tone: "muted", order: 1 },
  [LeadStatus.Contacted]: { label: "Contacted", tone: "warning", order: 2 },
  [LeadStatus.RecoveryStarted]: { label: "Recovery started", tone: "warning", order: 3 },
  [LeadStatus.Recovered]: { label: "Recovered", tone: "success", order: 4 },
  [LeadStatus.Rejected]: { label: "Rejected", tone: "destructive", order: 5 },
  [LeadStatus.Lost]: { label: "Lost", tone: "destructive", order: 6 },
};

export const LEAD_PIPELINE_ORDER: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Reviewed,
  LeadStatus.Contacted,
  LeadStatus.RecoveryStarted,
  LeadStatus.Recovered,
];

export interface LeadNote {
  id: ID;
  at: ISODate;
  body: string;
}

export interface CaseLead extends BaseEntity {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  brokerName: string;
  loadCount: string;
  estimatedAmount?: USD;
  details?: string;
  status: LeadStatus;
  source: "landing" | "manual" | "referral";
  tags: string[];
  notes: LeadNote[];
  /** Set once a recovery (claim/load) is started from this lead. */
  linkedClaimId?: ID | null;
  lastContactedAt?: ISODate | null;
}
