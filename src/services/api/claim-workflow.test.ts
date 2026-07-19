import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/services/backend/store";
import { loadsApi } from "@/services/api/loads";
import { claimsApi } from "@/services/api/claims";
import { followupsApi } from "@/services/api/followups";
import { StopType } from "@/types/load";
import { ClaimStatus } from "@/types/claim";
import { FollowUpCadence, FollowUpStatus } from "@/types/followup";

const loadInput = {
  referenceNumber: "LD-TEST-1",
  brokerName: "TQL Logistics",
  customerName: "Test Carrier",
  customerPhone: "+15551234567",
  freeHours: 2,
  ratePerHour: 75,
  stops: [
    {
      type: StopType.Pickup,
      sequence: 1,
      address: "Dallas, TX",
      arrivedAt: "2026-01-01T08:00:00Z",
      departedAt: "2026-01-01T13:00:00Z", // 5h dwell → 3h billable
    },
  ],
  documents: { hasRateConfirmation: true, hasBol: true, hasPod: true, hasTimestamps: true },
};

describe("claim lifecycle (integration)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
  });

  it("creates a load with correctly computed detention", async () => {
    const load = await loadsApi.create(loadInput);
    expect(load.billableDetentionHours).toBe(3);
    expect(load.detentionAmount).toBe(225); // 3h × $75
    expect(load.missingDocuments).toHaveLength(0);
  });

  it("generates a claim from a load idempotently", async () => {
    const load = await loadsApi.create(loadInput);
    const claim1 = await loadsApi.createClaim(load.id);
    const claim2 = await loadsApi.createClaim(load.id);
    expect(claim1.id).toBe(claim2.id); // idempotent
    expect(claim1.claimedAmount).toBe(225);
    expect(claim1.status).toBe(ClaimStatus.Draft);
  });

  it("marks a claim paid, computing commission and cancelling follow-ups", async () => {
    const load = await loadsApi.create(loadInput);
    const claim = await loadsApi.createClaim(load.id);

    // Send + schedule a follow-up.
    await claimsApi.setStatus(claim.id, ClaimStatus.Sent);
    await followupsApi.schedule({
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      brokerName: claim.brokerName,
      cadence: FollowUpCadence.Day7,
    });

    const paid = await claimsApi.markPaid(claim.id, 225);
    expect(paid.status).toBe(ClaimStatus.Paid);
    expect(paid.recoveredAmount).toBe(225);
    expect(paid.commissionAmount).toBeCloseTo(56.25, 2); // 25%
    expect(paid.carrierPayout).toBeCloseTo(168.75, 2);

    // Follow-ups for this claim must be cancelled on payment.
    const followups = await followupsApi.list({ claimId: claim.id });
    expect(followups.every((f) => f.status === FollowUpStatus.Cancelled)).toBe(true);
  });

  it("records an audit activity when a claim is paid", async () => {
    const { activityApi } = await import("@/services/api/activity");
    const load = await loadsApi.create(loadInput);
    const claim = await loadsApi.createClaim(load.id);
    await claimsApi.markPaid(claim.id, 200);
    const activity = await activityApi.recent(20);
    expect(activity.some((a) => a.type === "payment_received" && a.claimId === claim.id)).toBe(true);
  });
});
