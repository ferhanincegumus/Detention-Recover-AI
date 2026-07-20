import { describe, it, expect } from "vitest";
import { calculateChargeAmount, requiredDocsFor } from "@/services/domain/charges";
import { ChargeType } from "@/types/common";

describe("calculateChargeAmount", () => {
  it("detention uses the precomputed hours-based amount", () => {
    const r = calculateChargeAmount({ chargeType: ChargeType.Detention, detentionAmount: 225 });
    expect(r.amount).toBe(225);
    expect(r.basis).toMatch(/detention/i);
  });

  it("layover multiplies nights by nightly rate", () => {
    const r = calculateChargeAmount({
      chargeType: ChargeType.Layover,
      layoverNights: 2,
      layoverNightlyRate: 150,
    });
    expect(r.amount).toBe(300);
    expect(r.basis).toBe("2 nights × $150/night");
  });

  it("layover handles a single night label", () => {
    const r = calculateChargeAmount({ chargeType: ChargeType.Layover, layoverNights: 1, layoverNightlyRate: 200 });
    expect(r.amount).toBe(200);
    expect(r.basis).toBe("1 night × $200/night");
  });

  it("TONU is a flat fee", () => {
    const r = calculateChargeAmount({ chargeType: ChargeType.Tonu, tonuAmount: 250 });
    expect(r.amount).toBe(250);
    expect(r.basis).toMatch(/TONU/);
  });

  it("accessorial uses the stated amount", () => {
    const r = calculateChargeAmount({ chargeType: ChargeType.Accessorial, accessorialAmount: 180 });
    expect(r.amount).toBe(180);
  });

  it("never returns a negative amount", () => {
    expect(calculateChargeAmount({ chargeType: ChargeType.Tonu, tonuAmount: -50 }).amount).toBe(0);
    expect(calculateChargeAmount({ chargeType: ChargeType.Layover, layoverNights: -1, layoverNightlyRate: 100 }).amount).toBe(0);
  });
});

describe("requiredDocsFor", () => {
  it("detention needs timestamps + POD", () => {
    expect(requiredDocsFor(ChargeType.Detention)).toEqual({ needsTimestamps: true, needsPod: true });
  });
  it("TONU needs neither timestamps nor POD (proven by rate con)", () => {
    expect(requiredDocsFor(ChargeType.Tonu)).toEqual({ needsTimestamps: false, needsPod: false });
  });
  it("layover needs POD but not gate timestamps", () => {
    expect(requiredDocsFor(ChargeType.Layover)).toEqual({ needsTimestamps: false, needsPod: true });
  });
});
