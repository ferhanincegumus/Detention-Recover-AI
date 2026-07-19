/**
 * Base44 Function: public-lead-intake
 * Public endpoint the landing-page case form posts to. Creates a CaseLead,
 * texts the founder, and auto-acknowledges the customer by SMS.
 *
 * Idempotent within a 60s window per (email + broker) to absorb double submits.
 * Rate-limited by IP to deter abuse.
 */
import { entities, functions } from "@base44/sdk";

const WINDOW_MS = 60_000;
const rateHits = new Map();

function rateLimited(ip, limit = 5, windowMs = 60_000, now = Date.now()) {
  const entry = rateHits.get(ip);
  if (!entry || now - entry.windowStart >= windowMs) {
    rateHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

export default async function handler(req) {
  const ip = req.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) return { status: 429, body: { error: "too many requests" } };

  const { companyName, contactName, phone, email, brokerName, loadCount, estimatedAmount, details } = req.body;
  if (!companyName || !phone || !email || !brokerName) {
    return { status: 400, body: { error: "missing required fields" } };
  }

  // Idempotency: dedupe a recent identical submission.
  const recent = await entities.CaseLead.filter({ email, brokerName });
  const dup = recent.find((l) => Date.now() - new Date(l.createdAt).getTime() < WINDOW_MS);
  if (dup) return { status: 200, body: { id: dup.id, deduped: true } };

  const lead = await entities.CaseLead.create({
    companyName, contactName, phone, email, brokerName,
    loadCount: loadCount || "1",
    estimatedAmount: estimatedAmount ? Number(estimatedAmount) : undefined,
    details, status: "new", source: "landing", tags: [], notes: [],
    linkedClaimId: null, lastContactedAt: null,
  });

  await entities.Activity.create({
    type: "lead_created", title: `New case lead: ${companyName}`,
    description: `${contactName} · ${brokerName}`, leadId: lead.id, automated: false,
  });

  // Auto-acknowledge the customer.
  await functions.invoke("send-sms", { to: phone, event: "case_opened", leadId: lead.id }).catch(() => {});

  return { status: 200, body: { id: lead.id } };
}
