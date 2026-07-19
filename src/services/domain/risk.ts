import { clamp, percentage } from "@/lib/utils";
import { riskFromScore, type RiskLevel } from "@/types/common";
import type { Load } from "@/types/load";
import type { Claim } from "@/types/claim";
import { ClaimStatus } from "@/types/claim";

/**
 * Load risk = likelihood this load yields a defensible, recoverable claim.
 * Higher score → stronger claim. Missing docs and thin detention lower it.
 */
export function scoreLoadStrength(load: Pick<Load, "documents" | "billableDetentionHours" | "missingDocuments">): {
  score: number;
  level: RiskLevel;
} {
  let score = 100;
  score -= load.missingDocuments.length * 18;
  if (!load.documents.hasTimestamps) score -= 15;
  if (load.billableDetentionHours < 1) score -= 25;
  else if (load.billableDetentionHours < 2) score -= 10;
  const clamped = clamp(Math.round(score), 5, 100);
  return { score: clamped, level: riskFromScore(clamped) };
}

/**
 * Broker delay/risk from historical claim behavior. Higher → pays slower,
 * denies more, pushes back harder.
 */
export function scoreBrokerRisk(claims: Pick<Claim, "status" | "daysToRecover">[]): {
  delayScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  avgPaymentDays: number;
  recoveryRate: number;
} {
  if (claims.length === 0) {
    return { delayScore: 40, riskScore: 40, riskLevel: "medium", avgPaymentDays: 0, recoveryRate: 0 };
  }

  const resolvedStatuses: ClaimStatus[] = [ClaimStatus.Paid, ClaimStatus.Denied, ClaimStatus.Closed];
  const resolved = claims.filter((c) => resolvedStatuses.includes(c.status));
  const paid = claims.filter((c) => c.status === ClaimStatus.Paid);
  const denied = claims.filter((c) => c.status === ClaimStatus.Denied);

  const paymentDays = paid
    .map((c) => c.daysToRecover ?? 0)
    .filter((d) => d > 0);
  const avgPaymentDays = paymentDays.length
    ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length)
    : 0;

  const recoveryRate = resolved.length ? percentage(paid.length, resolved.length) : 0;
  const denialRate = resolved.length ? percentage(denied.length, resolved.length) : 0;

  // Delay: 30d ~ neutral(50), 60d+ high. Denials add risk.
  const delayScore = clamp(Math.round((avgPaymentDays / 60) * 100), 0, 100);
  const riskScore = clamp(Math.round(delayScore * 0.6 + denialRate * 0.4), 0, 100);

  return {
    delayScore,
    riskScore,
    riskLevel: riskFromScore(riskScore),
    avgPaymentDays,
    recoveryRate: Math.round(recoveryRate),
  };
}

/**
 * Recovery probability for an individual claim, blending broker behavior and
 * evidence completeness. Returns 0–100.
 */
export function estimateRecoveryProbability(params: {
  brokerRecoveryRate: number;
  loadStrengthScore: number;
  hasCompleteEvidence: boolean;
}): number {
  const { brokerRecoveryRate, loadStrengthScore, hasCompleteEvidence } = params;
  const base = brokerRecoveryRate * 0.45 + loadStrengthScore * 0.45;
  const evidenceBoost = hasCompleteEvidence ? 10 : -5;
  return clamp(Math.round(base + evidenceBoost), 5, 98);
}
