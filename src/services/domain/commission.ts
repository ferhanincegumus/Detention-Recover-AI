import type { USD } from "@/types/common";

export interface CommissionBreakdown {
  recoveredAmount: USD;
  commissionRate: number;
  commissionAmount: USD;
  carrierPayout: USD;
}

/**
 * Split a recovered amount into our commission and the carrier's payout.
 * Contingency model — commission only applies to money actually recovered.
 */
export function calculateCommission(recoveredAmount: USD, commissionRate: number): CommissionBreakdown {
  const safeAmount = Math.max(0, recoveredAmount);
  const commissionAmount = Math.round(safeAmount * commissionRate * 100) / 100;
  return {
    recoveredAmount: safeAmount,
    commissionRate,
    commissionAmount,
    carrierPayout: Math.round((safeAmount - commissionAmount) * 100) / 100,
  };
}
