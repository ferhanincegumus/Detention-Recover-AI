/**
 * Webhook security & idempotency helpers shared by the Base44 inbound
 * functions (Resend email, Twilio SMS/WhatsApp). Pure and unit-testable.
 */

/** Constant-time string comparison to prevent signature timing attacks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify an HMAC signature. The actual HMAC computation is injected so this
 * stays environment-agnostic (Web Crypto in Base44 functions, a stub in tests).
 */
export async function verifySignature(params: {
  payload: string;
  signature: string;
  secret: string;
  computeHmac: (payload: string, secret: string) => Promise<string> | string;
}): Promise<boolean> {
  if (!params.signature || !params.secret) return false;
  const expected = await params.computeHmac(params.payload, params.secret);
  return safeEqual(expected, params.signature);
}

/**
 * Deduplicate inbound webhook deliveries by provider event id. Providers
 * retry on non-2xx, so every handler must be idempotent.
 */
export class WebhookDeduplicator {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly capacity = 1000) {}

  /** Returns true the first time an id is seen, false on duplicates. */
  markProcessed(eventId: string): boolean {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    this.order.push(eventId);
    if (this.order.length > this.capacity) {
      const evicted = this.order.shift();
      if (evicted) this.seen.delete(evicted);
    }
    return true;
  }

  has(eventId: string): boolean {
    return this.seen.has(eventId);
  }
}

/** Simple fixed-window rate limiter for webhook endpoints. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly limit = 60,
    private readonly windowMs = 60_000,
  ) {}

  /** Returns true if the request is allowed. `now` is injectable for tests. */
  allow(key: string, now: number): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }
}
