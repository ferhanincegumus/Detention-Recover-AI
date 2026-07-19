import { describe, it, expect } from "vitest";
import { calculateCommission } from "@/services/domain/commission";

describe("calculateCommission", () => {
  it("splits recovered money into commission and carrier payout", () => {
    const result = calculateCommission(1000, 0.25);
    expect(result.commissionAmount).toBe(250);
    expect(result.carrierPayout).toBe(750);
    expect(result.recoveredAmount).toBe(1000);
  });

  it("clamps negative recoveries to zero", () => {
    const result = calculateCommission(-500, 0.25);
    expect(result.recoveredAmount).toBe(0);
    expect(result.commissionAmount).toBe(0);
    expect(result.carrierPayout).toBe(0);
  });

  it("rounds to cents", () => {
    const result = calculateCommission(333.33, 0.3);
    expect(result.commissionAmount).toBeCloseTo(100, 1);
    expect(result.commissionAmount + result.carrierPayout).toBeCloseTo(333.33, 2);
  });
});
