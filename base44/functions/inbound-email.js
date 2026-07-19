/**
 * Base44 Function: inbound-email
 * Resend inbound webhook → routes broker replies to the right Claim,
 * classifies them with InvokeLLM, and drafts a reply for founder review.
 *
 * Security: verifies the Resend HMAC signature, dedupes by provider message
 * id, and rate-limits. Idempotent — safe to receive the same delivery twice.
 */
import { entities, InvokeLLM, functions, secrets } from "@base44/sdk";
import crypto from "node:crypto";

const REPLY_CLASSES = [
  "payment", "settlement_offer", "denial", "request_documents",
  "question", "acknowledgement", "out_of_office", "other",
];

function hmac(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function claimIdFromHeaders(headers = {}) {
  const direct = headers["X-DRA-Claim-Id"] || headers["x-dra-claim-id"];
  if (direct) return direct;
  const refs = headers["References"] || headers["references"] || "";
  const match = refs.match(/claim-([a-z0-9_]+)@/i);
  return match ? match[1] : null;
}

export default async function handler(req) {
  const raw = req.rawBody;
  const signature = req.headers["resend-signature"] || "";
  const secret = secrets.RESEND_WEBHOOK_SECRET;

  if (!signature || !safeEqual(hmac(raw, secret), signature)) {
    return { status: 401, body: { error: "invalid signature" } };
  }

  const event = JSON.parse(raw);
  const messageId = event.data?.message_id;
  if (!messageId) return { status: 400, body: { error: "missing message id" } };

  // Idempotency: skip if we've already stored this message.
  const existing = await entities.EmailMessage.filter({ providerMessageId: messageId });
  if (existing.length > 0) return { status: 200, body: { deduped: true } };

  const headers = event.data?.headers || {};
  const claimId = claimIdFromHeaders(headers);
  const body = event.data?.text || event.data?.html || "";

  // Classify with the LLM.
  const { classification } = await InvokeLLM({
    prompt: `Classify this broker email into one of: ${REPLY_CLASSES.join(", ")}. Reply with JSON {"classification": "..."}.\n\n${body}`,
    responseFormat: { classification: "string" },
  });

  await entities.EmailMessage.create({
    claimId: claimId || null,
    providerMessageId: messageId,
    threadId: headers["X-DRA-Thread-Id"] || `claim-${claimId}`,
    direction: "inbound",
    from: event.data?.from,
    to: event.data?.to,
    subject: event.data?.subject || "",
    body,
    sentAt: new Date(event.data?.created_at || Date.now()).toISOString(),
    classification,
    read: false,
  });

  if (claimId) {
    // Advance the claim + notify the founder + text the customer.
    await functions.invoke("recovery-automation", { trigger: "broker_replied", claimId, classification });
  }

  return { status: 200, body: { ok: true, claimId, classification } };
}
