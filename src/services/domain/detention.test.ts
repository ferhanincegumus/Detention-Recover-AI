import { describe, it, expect } from "vitest";
import { calculateDetention, detectMissingDocuments, stopDetentionHours } from "@/services/domain/detention";
import { StopType, type LoadStop } from "@/types/load";

function stop(arrivedAt: string | undefined, departedAt: string | undefined): LoadStop {
  return {
    id: "s1",
    type: StopType.Pickup,
    sequence: 1,
    address: "Dallas, TX",
    arrivedAt,
    departedAt,
  };
}

describe("stopDetentionHours", () => {
  it("returns 0 when timestamps are missing", () => {
    expect(stopDetentionHours(stop(undefined, undefined), 2)).toBe(0);
  });

  it("subtracts free time from the dwell", () => {
    // 5 hours on site, 2 free → 3 billable
    const s = stop("2026-01-01T08:00:00Z", "2026-01-01T13:00:00Z");
    expect(stopDetentionHours(s, 2)).toBe(3);
  });

  it("never goes negative when dwell is under free time", () => {
    const s = stop("2026-01-01T08:00:00Z", "2026-01-01T09:00:00Z");
    expect(stopDetentionHours(s, 2)).toBe(0);
  });
});

describe("calculateDetention", () => {
  it("sums billable hours across stops and multiplies by rate", () => {
    const stops: LoadStop[] = [
      { ...stop("2026-01-01T08:00:00Z", "2026-01-01T13:00:00Z"), id: "a" }, // 3h billable
      {
        ...stop("2026-01-02T08:00:00Z", "2026-01-02T11:00:00Z"),
        id: "b",
        type: StopType.Delivery,
      }, // 1h billable
    ];
    const result = calculateDetention(stops, 2, 75);
    expect(result.billableHours).toBe(4);
    expect(result.amount).toBe(300);
    expect(result.perStop).toHaveLength(2);
  });

  it("returns zero for an empty load", () => {
    expect(calculateDetention([], 2, 75)).toEqual({ billableHours: 0, amount: 0, perStop: [] });
  });
});

describe("detectMissingDocuments", () => {
  it("flags every missing document type", () => {
    const missing = detectMissingDocuments({
      documents: { hasRateConfirmation: false, hasBol: false, hasPod: false, hasTimestamps: false },
      stops: [stop(undefined, undefined)],
    });
    expect(missing).toContain("Rate confirmation");
    expect(missing).toContain("Bill of lading (BOL)");
    expect(missing).toContain("Proof of delivery (POD)");
    expect(missing).toContain("Gate in/out timestamps");
  });

  it("returns empty when everything is present", () => {
    const missing = detectMissingDocuments({
      documents: { hasRateConfirmation: true, hasBol: true, hasPod: true, hasTimestamps: true },
      stops: [stop("2026-01-01T08:00:00Z", "2026-01-01T13:00:00Z")],
    });
    expect(missing).toHaveLength(0);
  });
});
