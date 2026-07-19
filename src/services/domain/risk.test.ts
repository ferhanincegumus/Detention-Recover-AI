import { describe, it, expect } from "vitest";
import { scoreLoadStrength, scoreBrokerRisk, estimateRecoveryProbability } from "@/services/domain/risk";
import { ClaimStatus } from "@/types/claim";

describe("scoreLoadStrength", () => {
  it("scores a complete, well-documented load highly", () => {
    const result = scoreLoadStrength({
      documents: { hasRateConfirmation: true, hasBol: true, hasPod: true, hasTimestamps: true },
      billableDetentionHours: 4,
      missingDocuments: [],
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("low");
  });

  it("penalizes missing documents and thin detention", () => {
    const result = scoreLoadStrength({
      documents: { hasRateConfirmation: true, hasBol: false, hasPod: false, hasTimestamps: false },
      billableDetentionHours: 0.5,
      missingDocuments: ["BOL", "POD", "Gate in/out timestamps"],
    });
    expect(result.score).toBeLessThan(50);
    expect(["medium", "high"]).toContain(result.level);
  });
});

describe("scoreBrokerRisk", () => {
  it("returns a neutral baseline with no claims", () => {
    const result = scoreBrokerRisk([]);
    expect(result.riskLevel).toBe("medium");
    expect(result.recoveryRate).toBe(0);
  });

  it("computes recovery rate and payment days from resolved claims", () => {
    const result = scoreBrokerRisk([
      { status: ClaimStatus.Paid, daysToRecover: 30 },
      { status: ClaimStatus.Paid, daysToRecover: 50 },
      { status: ClaimStatus.Denied, daysToRecover: null },
      { status: ClaimStatus.Sent, daysToRecover: null }, // unresolved — excluded
    ]);
    // 2 paid of 3 resolved ≈ 67%
    expect(result.recoveryRate).toBe(67);
    expect(result.avgPaymentDays).toBe(40);
  });
});

describe("estimateRecoveryProbability", () => {
  it("rewards complete evidence and strong loads", () => {
    const strong = estimateRecoveryProbability({ brokerRecoveryRate: 80, loadStrengthScore: 90, hasCompleteEvidence: true });
    const weak = estimateRecoveryProbability({ brokerRecoveryRate: 40, loadStrengthScore: 30, hasCompleteEvidence: false });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(98);
    expect(weak).toBeGreaterThanOrEqual(5);
  });
});
