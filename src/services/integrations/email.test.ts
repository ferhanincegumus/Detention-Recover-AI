import { describe, it, expect } from "vitest";
import {
  buildOutboundEmail,
  claimIdFromHeaders,
  idempotencyKey,
  retryDelayMs,
  threadHeaders,
} from "@/services/integrations/email";

describe("idempotencyKey", () => {
  it("is stable for identical content and differs otherwise", () => {
    const a = idempotencyKey("claim_1", "hello");
    const b = idempotencyKey("claim_1", "hello");
    const c = idempotencyKey("claim_1", "world");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("buildOutboundEmail", () => {
  it("builds html/text and threading headers", () => {
    const email = buildOutboundEmail({
      from: "us@dra.ai",
      to: "broker@tql.com",
      subject: "Detention claim CLM-2601",
      body: "Line one\n\nLine two",
      claimId: "claim_1",
    });
    expect(email.text).toContain("Line one");
    expect(email.html).toContain("<p>Line one</p>");
    expect(email.html).toContain("<br/>");
    expect(email.headers["X-DRA-Claim-Id"]).toBe("claim_1");
    expect(email.idempotencyKey).toMatch(/^dra-claim_1-/);
  });

  it("escapes HTML in the body", () => {
    const email = buildOutboundEmail({
      from: "a", to: "b", subject: "s", body: "<script>alert(1)</script>", claimId: "c",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("claimIdFromHeaders", () => {
  it("reads the direct header", () => {
    expect(claimIdFromHeaders({ "X-DRA-Claim-Id": "claim_9" })).toBe("claim_9");
  });
  it("falls back to the References header", () => {
    const headers = threadHeaders("claim_42");
    expect(claimIdFromHeaders(headers)).toBe("claim_42");
  });
  it("returns null when absent", () => {
    expect(claimIdFromHeaders({})).toBeNull();
  });
});

describe("retryDelayMs", () => {
  it("backs off exponentially and caps", () => {
    expect(retryDelayMs(0)).toBe(2000);
    expect(retryDelayMs(1)).toBe(4000);
    expect(retryDelayMs(2)).toBe(8000);
    expect(retryDelayMs(10)).toBe(16000);
  });
});
