import type { BaseEntity, ChargeType, ID, ISODate, RiskLevel, USD } from "@/types/common";

export const StopType = {
  Pickup: "pickup",
  Delivery: "delivery",
} as const;
export type StopType = (typeof StopType)[keyof typeof StopType];

export interface LoadStop {
  id: ID;
  type: StopType;
  sequence: number;
  facilityName?: string;
  address: string;
  /** Scheduled appointment window start. */
  appointmentAt?: ISODate;
  /** When the truck actually arrived (check-in). */
  arrivedAt?: ISODate;
  /** When the truck was released (check-out). */
  departedAt?: ISODate;
}

export interface DocumentFlags {
  hasRateConfirmation: boolean;
  hasBol: boolean;
  hasPod: boolean;
  hasTimestamps: boolean;
}

export interface Load extends BaseEntity {
  referenceNumber: string;
  brokerId?: ID;
  brokerName: string;
  customerName?: string;
  customerPhone?: string;
  driverName?: string;
  /** What kind of charge this load's claim pursues. */
  chargeType: ChargeType;
  /** Free time before detention accrues (hours). Broker-specific. */
  freeHours: number;
  /** Detention rate per hour ($). */
  ratePerHour: USD;
  stops: LoadStop[];
  /** Computed total detained hours across stops (beyond free time). */
  billableDetentionHours: number;
  /** Computed detention owed = billableDetentionHours * ratePerHour. */
  detentionAmount: USD;
  /** Layover: number of nights. */
  layoverNights?: number;
  /** Layover: nightly rate ($). */
  layoverNightlyRate?: USD;
  /** TONU: flat fee ($). */
  tonuAmount?: USD;
  /** Accessorial: amount ($) and description. */
  accessorialAmount?: USD;
  accessorialDescription?: string;
  /** Resolved claim amount for this load's charge type. */
  chargeAmount: USD;
  /** Plain-language basis for the charge amount (e.g. "2 nights × $150"). */
  chargeBasis: string;
  documents: DocumentFlags;
  /** 0–100 likelihood this load has a recoverable, defensible claim. */
  riskScore: number;
  riskLevel: RiskLevel;
  /** Documents the AI flagged as missing for a strong claim. */
  missingDocuments: string[];
  rateConfirmationFileId?: ID;
  notes?: string;
  /** Whether a claim has been generated from this load. */
  claimId?: ID | null;
}

/** Draft shape produced by the AI rate-confirmation parser. */
export interface ParsedRateConfirmation {
  brokerName: string;
  referenceNumber: string;
  freeHours: number;
  ratePerHour: USD;
  customerPhone?: string;
  driverName?: string;
  stops: Omit<LoadStop, "id">[];
  confidence: number;
  warnings: string[];
}
