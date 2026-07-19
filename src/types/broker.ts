import type { BaseEntity, ID, RiskLevel, USD } from "@/types/common";

export interface Broker extends BaseEntity {
  name: string;
  mcNumber?: string;
  email?: string;
  phone?: string;
  billingEmail?: string;
  address?: string;
  notes?: string;
  /** Aggregated intelligence — recomputed by the broker analytics service. */
  intel: BrokerIntel;
}

export interface BrokerIntel {
  totalClaims: number;
  recoveredAmount: USD;
  pendingAmount: USD;
  /** Share of pursued claims that were recovered (0–100). */
  recoveryRate: number;
  /** Average days from claim sent to payment. */
  avgPaymentDays: number;
  /** Average hours to first reply. */
  avgReplyHours: number;
  /** 0–100; higher = pays slower / pushes back harder. */
  delayScore: number;
  /** 0–100 composite of delay, denial, and dispute behavior. */
  riskScore: number;
  riskLevel: RiskLevel;
  /** AI-generated negotiation guidance, refreshed periodically. */
  aiSuggestion?: string;
}

export interface BrokerLeaderboardRow {
  brokerId: ID;
  name: string;
  recoveredAmount: USD;
  recoveryRate: number;
  avgPaymentDays: number;
  totalClaims: number;
  riskLevel: RiskLevel;
}
