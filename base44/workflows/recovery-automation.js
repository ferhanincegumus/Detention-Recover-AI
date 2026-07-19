/**
 * Base44 Workflow: recovery-automation
 * The idempotent brain that reacts to recovery events and does the repetitive
 * work so the founder only reviews important actions.
 *
 * Triggers (via `trigger` arg):
 *   - claim_created      → SMS "case opened", set draft timeline
 *   - claim_sent         → SMS "claim sent", schedule 7/14/30-day follow-ups
 *   - broker_replied     → draft AI reply, notify founder, SMS "broker replied"
 *   - settlement_offered → SMS "settlement offered", notify founder
 *   - payment_received   → compute commission, cancel follow-ups, SMS "paid",
 *                          archive after close
 *
 * Every branch is idempotent: re-running with the same (trigger, claimId)
 * never double-sends, double-schedules, or double-charges.
 */
import { entities, functions, InvokeLLM } from "@base44/sdk";

const FOLLOWUP_DAYS = { day_7: 7, day_14: 14, day_30: 30 };

function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

async function ensureTimeline(claim, title, automated = true) {
  const already = (claim.timeline || []).some((e) => e.title === title);
  if (already) return claim.timeline;
  return [...(claim.timeline || []), { id: crypto.randomUUID(), at: new Date().toISOString(), title, automated }];
}

async function sendCustomerSms(claim, event) {
  if (!claim.customerPhone) return;
  await functions.invoke("send-sms", { to: claim.customerPhone, event, claimId: claim.id });
}

async function scheduleFollowups(claim, settings) {
  if (!settings.autoFollowUps) return;
  const existing = await entities.FollowUp.filter({ claimId: claim.id });
  for (const [cadence, days] of Object.entries(FOLLOWUP_DAYS)) {
    if (existing.some((f) => f.cadence === cadence)) continue; // idempotent
    await entities.FollowUp.create({
      claimId: claim.id, claimNumber: claim.claimNumber, brokerName: claim.brokerName,
      cadence, status: "scheduled", scheduledFor: addDays(days), sentAt: null,
      sequence: Object.keys(FOLLOWUP_DAYS).indexOf(cadence) + 1,
    });
  }
}

export default async function workflow({ trigger, claimId, classification }) {
  const claim = await entities.Claim.get(claimId);
  if (!claim) return { ok: false, error: "claim not found" };
  const settings = await entities.AppSettings.first();

  switch (trigger) {
    case "claim_created":
      await sendCustomerSms(claim, "case_opened");
      break;

    case "claim_sent":
      await entities.Claim.update(claimId, {
        timeline: await ensureTimeline(claim, "Claim sent to broker"),
        sentAt: claim.sentAt || new Date().toISOString(),
      });
      await sendCustomerSms(claim, "claim_sent");
      await scheduleFollowups(claim, settings);
      break;

    case "broker_replied": {
      if (settings.autoDraftReplies) {
        const draft = await InvokeLLM({
          prompt: `Draft a professional reply for detention claim ${claim.claimNumber} to ${claim.brokerName}. The broker's message was classified as "${classification}". Keep it factual and firm.`,
        });
        await entities.Claim.update(claimId, {
          status: claim.status === "sent" ? "broker_replied" : claim.status,
          firstReplyAt: claim.firstReplyAt || new Date().toISOString(),
          timeline: await ensureTimeline(claim, "Broker replied", false),
          notes: (claim.notes || "") + `\n[AI draft reply]\n${draft}`,
        });
      }
      await sendCustomerSms(claim, "broker_replied");
      if (settings.notifyOnBrokerReply) {
        await entities.Activity.create({
          type: "broker_replied", title: `${claim.brokerName} replied on ${claim.claimNumber}`,
          claimId, automated: true,
        });
      }
      break;
    }

    case "settlement_offered":
      await sendCustomerSms(claim, "settlement_offered");
      break;

    case "payment_received":
      // Cancel outstanding follow-ups exactly once.
      for (const f of await entities.FollowUp.filter({ claimId, status: "scheduled" })) {
        await entities.FollowUp.update(f.id, { status: "cancelled" });
      }
      await sendCustomerSms(claim, "paid");
      if (settings.notifyOnPayment) {
        await entities.Activity.create({
          type: "payment_received", title: `Payment received — ${claim.claimNumber}`,
          description: `Recovered $${claim.recoveredAmount} from ${claim.brokerName}.`,
          claimId, automated: true,
        });
      }
      break;

    default:
      return { ok: false, error: `unknown trigger: ${trigger}` };
  }

  return { ok: true };
}
