import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/services/backend/store";
import { loadsApi, type LoadInput } from "@/services/api/loads";
import { StopType } from "@/types/load";
import { ChargeType } from "@/types/common";

const base = {
  brokerName: "TQL Logistics",
  customerName: "Test Carrier",
  freeHours: 2,
  ratePerHour: 75,
  documents: { hasRateConfirmation: true, hasBol: true, hasPod: true, hasTimestamps: true },
};

function detentionLoad(): LoadInput {
  return {
    ...base,
    referenceNumber: "LD-DET",
    chargeType: ChargeType.Detention,
    stops: [
      {
        type: StopType.Pickup,
        sequence: 1,
        address: "Dallas, TX",
        arrivedAt: "2026-01-01T08:00:00Z",
        departedAt: "2026-01-01T13:00:00Z", // 5h dwell → 3h billable × $75 = $225
      },
    ],
  };
}

describe("claim creation per charge type", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
  });

  it("detention → hours × rate", async () => {
    const load = await loadsApi.create(detentionLoad());
    expect(load.chargeAmount).toBe(225);
    const claim = await loadsApi.createClaim(load.id);
    expect(claim.chargeType).toBe(ChargeType.Detention);
    expect(claim.claimedAmount).toBe(225);
  });

  it("layover → nights × nightly rate", async () => {
    const load = await loadsApi.create({
      ...base,
      referenceNumber: "LD-LAY",
      chargeType: ChargeType.Layover,
      stops: [],
      layoverNights: 2,
      layoverNightlyRate: 150,
    });
    expect(load.chargeAmount).toBe(300);
    const claim = await loadsApi.createClaim(load.id);
    expect(claim.chargeType).toBe(ChargeType.Layover);
    expect(claim.claimedAmount).toBe(300);
  });

  it("TONU → flat fee, no timestamps required", async () => {
    const load = await loadsApi.create({
      ...base,
      referenceNumber: "LD-TONU",
      chargeType: ChargeType.Tonu,
      documents: { hasRateConfirmation: true, hasBol: false, hasPod: false, hasTimestamps: false },
      stops: [],
      tonuAmount: 250,
    });
    expect(load.chargeAmount).toBe(250);
    // TONU is proven by the rate con — gate timestamps must NOT be flagged missing.
    expect(load.missingDocuments).not.toContain("Gate in/out timestamps");
    const claim = await loadsApi.createClaim(load.id);
    expect(claim.chargeType).toBe(ChargeType.Tonu);
    expect(claim.claimedAmount).toBe(250);
  });

  it("accessorial → stated amount", async () => {
    const load = await loadsApi.create({
      ...base,
      referenceNumber: "LD-ACC",
      chargeType: ChargeType.Accessorial,
      stops: [],
      accessorialAmount: 180,
      accessorialDescription: "Lumper fee",
    });
    expect(load.chargeAmount).toBe(180);
    const claim = await loadsApi.createClaim(load.id);
    expect(claim.chargeType).toBe(ChargeType.Accessorial);
    expect(claim.claimedAmount).toBe(180);
  });
});
