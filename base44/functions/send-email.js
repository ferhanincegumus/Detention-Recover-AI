/**
 * Base44 Function: send-email
 * Sends a claim/reply email via Resend with an idempotency key and thread
 * headers so broker replies route back to the right claim. Retries transient
 * failures with exponential backoff.
 */
import { entities, secrets } from "@base44/sdk";

function idempotencyKey(claimId, content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  return `dra-${claimId}-${(hash >>> 0).toString(36)}`;
}

async function resendSend(payload, apiKey, idemKey) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idemKey,
    },
    body: JSON.stringify(payload),
  });
}

export default async function handler(req) {
  const { claimId, to, subject, body, threadId } = req.body;
  const claim = await entities.Claim.get(claimId);
  if (!claim) return { status: 404, body: { error: "claim not found" } };

  const settings = await entities.AppSettings.first();
  const idemKey = idempotencyKey(claimId, subject + body);
  const threadHeader = threadId || `claim-${claimId}`;

  const payload = {
    from: `${settings.companyName} <${settings.companyEmail}>`,
    to,
    subject,
    text: body,
    headers: {
      "X-DRA-Claim-Id": claimId,
      "X-DRA-Thread-Id": threadHeader,
      References: `<${threadHeader}@detentionrecover.ai>`,
    },
  };

  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await resendSend(payload, secrets.RESEND_API_KEY, idemKey);
      if (res.ok) {
        const data = await res.json();
        await entities.EmailMessage.create({
          claimId, providerMessageId: data.id, threadId: threadHeader,
          direction: "outbound", from: settings.companyEmail, to, subject, body,
          sentAt: new Date().toISOString(), read: true,
        });
        return { status: 200, body: { id: data.id } };
      }
      if (res.status < 500) return { status: res.status, body: { error: await res.text() } };
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, Math.min(2000 * 2 ** attempt, 16000)));
  }
  return { status: 502, body: { error: String(lastError || "send failed after retries") } };
}
