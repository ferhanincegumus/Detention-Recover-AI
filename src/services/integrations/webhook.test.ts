import { describe, it, expect } from "vitest";
import {
  safeEqual,
  verifySignature,
  WebhookDeduplicator,
  RateLimiter,
} from "@/services/integrations/webhook";

describe("safeEqual", () => {
  it("matches identical strings and rejects different ones", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
    expect(safeEqual("abc123", "abc124")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("verifySignature", () => {
  const computeHmac = (payload: string, secret: string) => `${secret}:${payload.length}`;

  it("accepts a valid signature", async () => {
    const ok = await verifySignature({
      payload: "hello",
      signature: "s3cr3t:5",
      secret: "s3cr3t",
      computeHmac,
    });
    expect(ok).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const ok = await verifySignature({
      payload: "hello-world",
      signature: "s3cr3t:5",
      secret: "s3cr3t",
      computeHmac,
    });
    expect(ok).toBe(false);
  });

  it("rejects when secret or signature is missing", async () => {
    expect(await verifySignature({ payload: "x", signature: "", secret: "s", computeHmac })).toBe(false);
    expect(await verifySignature({ payload: "x", signature: "s", secret: "", computeHmac })).toBe(false);
  });
});

describe("WebhookDeduplicator", () => {
  it("processes an id once and dedupes retries", () => {
    const dedup = new WebhookDeduplicator();
    expect(dedup.markProcessed("evt_1")).toBe(true);
    expect(dedup.markProcessed("evt_1")).toBe(false);
    expect(dedup.has("evt_1")).toBe(true);
  });

  it("evicts old ids beyond capacity", () => {
    const dedup = new WebhookDeduplicator(2);
    dedup.markProcessed("a");
    dedup.markProcessed("b");
    dedup.markProcessed("c"); // evicts "a"
    expect(dedup.has("a")).toBe(false);
    expect(dedup.has("c")).toBe(true);
    // "a" can now be processed again as fresh
    expect(dedup.markProcessed("a")).toBe(true);
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit then blocks within a window", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow("ip", 0)).toBe(true);
    expect(limiter.allow("ip", 100)).toBe(true);
    expect(limiter.allow("ip", 200)).toBe(false);
  });

  it("resets after the window elapses", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.allow("ip", 0)).toBe(true);
    expect(limiter.allow("ip", 500)).toBe(false);
    expect(limiter.allow("ip", 1100)).toBe(true);
  });
});
