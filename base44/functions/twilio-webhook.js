/**
 * Base44 Function: twilio-webhook
 * Inbound SMS/WhatsApp from customers. Validates Twilio's signature, stores
 * the message, and links it to the customer's lead/claim. Idempotent by
 * Twilio MessageSid.
 */
import { entities, secrets } from "@base44/sdk";
import crypto from "node:crypto";

/** Twilio request validation per their signature spec. */
function validateTwilio(authToken, signature, url, params) {
  const sorted = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(sorted, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req) {
  const params = req.body; // form-encoded
  const signature = req.headers["x-twilio-signature"];
  const url = req.fullUrl;

  if (!validateTwilio(secrets.TWILIO_AUTH_TOKEN, signature, url, params)) {
    return { status: 403, body: "invalid signature" };
  }

  const sid = params.MessageSid;
  const dup = await entities.SmsMessage.filter({ providerSid: sid });
  if (dup.length > 0) return { status: 200, body: "<Response></Response>", contentType: "text/xml" };

  const isWhatsApp = (params.From || "").startsWith("whatsapp:");
  const fromNumber = (params.From || "").replace("whatsapp:", "");

  // Link to an existing lead/claim by phone.
  const leads = await entities.CaseLead.filter({ phone: fromNumber });
  const leadId = leads[0]?.id || null;

  await entities.SmsMessage.create({
    providerSid: sid,
    channel: isWhatsApp ? "whatsapp" : "sms",
    direction: "inbound",
    to: params.To,
    from: fromNumber,
    body: params.Body || "",
    leadId,
    status: "delivered",
  });

  return { status: 200, body: "<Response></Response>", contentType: "text/xml" };
}
