import { describe, it, expect } from "vitest";
import { buildMilestoneMessage, toTwilioPayload } from "@/services/integrations/messaging";
import { SmsEvent } from "@/types/communication";

const ctx = { companyName: "Detention Recover AI", brokerName: "TQL Logistics", claimNumber: "CLM-2601", amount: 1180 };

describe("buildMilestoneMessage", () => {
  it("produces a distinct message per milestone", () => {
    const events = Object.values(SmsEvent);
    const messages = events.map((e) => buildMilestoneMessage(e, ctx));
    // All non-empty and unique
    expect(messages.every((m) => m.length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(events.length);
  });

  it("includes the amount on paid/settlement events", () => {
    expect(buildMilestoneMessage(SmsEvent.Paid, ctx)).toContain("$1,180");
    expect(buildMilestoneMessage(SmsEvent.SettlementOffered, ctx)).toContain("$1,180");
  });

  it("references the claim number and broker", () => {
    const msg = buildMilestoneMessage(SmsEvent.ClaimSent, ctx);
    expect(msg).toContain("CLM-2601");
    expect(msg).toContain("TQL Logistics");
  });
});

describe("toTwilioPayload", () => {
  it("adds the whatsapp: prefix for WhatsApp", () => {
    const payload = toTwilioPayload({ to: "+15551234567", from: "+18885551234", body: "hi", channel: "whatsapp" });
    expect(payload.to).toBe("whatsapp:+15551234567");
    expect(payload.from).toBe("whatsapp:+18885551234");
  });

  it("leaves SMS numbers unprefixed", () => {
    const payload = toTwilioPayload({ to: "+15551234567", from: "+18885551234", body: "hi", channel: "sms" });
    expect(payload.to).toBe("+15551234567");
  });
});
