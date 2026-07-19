/**
 * Resend email integration contracts. Pure helpers used by the app and the
 * Base44 Resend/inbound-webhook functions. Kept side-effect-free so the
 * retry/idempotency/threading logic is unit-testable.
 */

export interface OutboundEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  /** Idempotency key prevents duplicate sends on retry. */
  idempotencyKey: string;
}

export interface BuildEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
  claimId: string;
  /** Existing thread id to keep replies grouped, if any. */
  threadId?: string;
}

/** Deterministic idempotency key from the claim + a content hash. */
export function idempotencyKey(claimId: string, content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  }
  return `dra-${claimId}-${(hash >>> 0).toString(36)}`;
}

/** RFC-style thread header so brokers' replies stay in the same conversation. */
export function threadHeaders(claimId: string, threadId?: string): Record<string, string> {
  const id = threadId ?? `claim-${claimId}`;
  return {
    "X-DRA-Claim-Id": claimId,
    "X-DRA-Thread-Id": id,
    References: `<${id}@detentionrecover.ai>`,
  };
}

export function buildOutboundEmail(params: BuildEmailParams): OutboundEmail {
  const text = params.body;
  const html = params.body
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br/>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
  return {
    from: params.from,
    to: params.to,
    subject: params.subject,
    text,
    html,
    headers: threadHeaders(params.claimId, params.threadId),
    idempotencyKey: idempotencyKey(params.claimId, params.subject + params.body),
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extract our claim id from an inbound email's headers for routing replies. */
export function claimIdFromHeaders(headers: Record<string, string>): string | null {
  const direct = headers["X-DRA-Claim-Id"] ?? headers["x-dra-claim-id"];
  if (direct) return direct;
  const refs = headers["References"] ?? headers["references"] ?? "";
  const match = refs.match(/claim-([a-z0-9_]+)@/i);
  return match?.[1] ?? null;
}

/** Retry-with-backoff policy for transient email/SMS provider failures. */
export function retryDelayMs(attempt: number, baseMs = 2000, maxMs = 16000): number {
  return Math.min(baseMs * 2 ** attempt, maxMs);
}
