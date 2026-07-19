/** Shared primitives for every domain entity. */

export type ID = string;
export type ISODate = string;

/** Base fields present on every persisted entity (Base44 convention). */
export interface BaseEntity {
  id: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Owner isolation — every record belongs to the single admin owner. */
  ownerId: ID;
  /** Soft-delete marker. Records are never hard-deleted. */
  deletedAt?: ISODate | null;
}

/** A charge type we pursue against brokers. */
export const ChargeType = {
  Detention: "detention",
  Layover: "layover",
  Tonu: "tonu",
  Accessorial: "accessorial",
} as const;
export type ChargeType = (typeof ChargeType)[keyof typeof ChargeType];

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  [ChargeType.Detention]: "Detention",
  [ChargeType.Layover]: "Layover",
  [ChargeType.Tonu]: "TONU",
  [ChargeType.Accessorial]: "Accessorial",
};

/** Communication channels used with customers and brokers. */
export const Channel = {
  Email: "email",
  Sms: "sms",
  WhatsApp: "whatsapp",
  Call: "call",
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

/** Risk / priority buckets used across brokers, loads, and claims. */
export const RiskLevel = {
  Low: "low",
  Medium: "medium",
  High: "high",
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export function riskFromScore(score: number): RiskLevel {
  if (score >= 67) return RiskLevel.High;
  if (score >= 34) return RiskLevel.Medium;
  return RiskLevel.Low;
}

/** Generic list query envelope used by the service layer. */
export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** A money amount in whole US dollars unless a field name says cents. */
export type USD = number;
