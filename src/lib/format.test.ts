import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyCompact, normalizePhone, formatPhone, initials } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats whole dollars", () => {
    expect(formatCurrency(1500)).toBe("$1,500");
  });
  it("handles null/NaN", () => {
    expect(formatCurrency(null)).toBe("$0");
    expect(formatCurrency(Number.NaN)).toBe("$0");
  });
});

describe("formatCurrencyCompact", () => {
  it("compacts thousands and millions", () => {
    expect(formatCurrencyCompact(2_800_000)).toBe("$2.8M");
    expect(formatCurrencyCompact(1_500)).toBe("$1.5K");
    expect(formatCurrencyCompact(750)).toBe("$750");
  });
});

describe("phone helpers", () => {
  it("normalizes a 10-digit number to E.164", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("+15551234567");
  });
  it("formats a stored number for display", () => {
    expect(formatPhone("+15551234567")).toBe("(555) 123-4567");
  });
});

describe("initials", () => {
  it("takes up to two initials", () => {
    expect(initials("Acme Logistics")).toBe("AL");
    expect(initials("Marcus")).toBe("M");
    expect(initials(undefined)).toBe("?");
  });
});
