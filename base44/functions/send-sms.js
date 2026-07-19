/**
 * Base44 Function: send-sms
 * Sends a milestone SMS or WhatsApp message to a customer via Twilio.
 * Message bodies come from the shared templates in
 * src/services/integrations/messaging.ts.
 */
import { entities, secrets } from "@base44/sdk";

const TEMPLATES = {
  case_opened: (c) => `${c.companyName}: We've opened your case against ${c.brokerName}. We'll build the claim and keep you posted — no action needed.`,
  claim_sent: (c) => `${c.companyName}: Your detention claim (${c.claimNumber}) was sent to ${c.brokerName}. We'll handle the follow-ups.`,
  broker_replied: (c) => `${c.companyName}: ${c.brokerName} responded to claim (${c.claimNumber}). We're on it and negotiating.`,
  missing_documents: (c) => `${c.companyName}: To strengthen your claim (${c.claimNumber}), we need one more document. Reply here and we'll guide you.`,
  settlement_offered: (c) => `${c.companyName}: ${c.brokerName} offered a settlement on claim (${c.claimNumber}). We'll advise before accepting.`,
  paid: (c) => `${c.companyName}: Paid! We recovered your detention on claim (${c.claimNumber}). Your payout is on the way. 🎉`,
  case_closed: (c) => `${c.companyName}: Your case (${c.claimNumber}) is now closed. Thanks for trusting us — send us your next load anytime.`,
};

export default async function handler(req) {
  const { to, event, claimId, leadId, channel = "sms" } = req.body;
  const settings = await entities.AppSettings.first();
  const claim = claimId ? await entities.Claim.get(claimId) : null;

  const ctx = {
    companyName: settings.companyName,
    brokerName: claim?.brokerName || "your broker",
    claimNumber: claim?.claimNumber || "",
  };
  const body = (TEMPLATES[event] || (() => `${ctx.companyName}: Update on your recovery.`))(ctx);

  const prefix = channel === "whatsapp" ? "whatsapp:" : "";
  const from = channel === "whatsapp" ? secrets.TWILIO_WHATSAPP_FROM : secrets.TWILIO_MESSAGING_FROM;

  const auth = Buffer.from(`${secrets.TWILIO_ACCOUNT_SID}:${secrets.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${secrets.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: `${prefix}${to}`, From: `${prefix}${from}`, Body: body }),
  });

  const data = await res.json();
  await entities.SmsMessage.create({
    providerSid: data.sid, channel, direction: "outbound",
    to, from, body, event, claimId: claimId || null, leadId: leadId || null,
    status: res.ok ? "sent" : "failed",
  });

  return { status: res.ok ? 200 : 502, body: { sid: data.sid, status: data.status } };
}
