// Edge Function: send-email
// Sends a claim/reply email via Resend, then records it as an outbound
// EmailMessage row owned by the authenticated admin. Idempotent per (claim,
// content) via a deterministic idempotency key. SMS is intentionally omitted.
//
// Secrets required: RESEND_API_KEY (SUPABASE_URL / SERVICE_ROLE_KEY are auto-injected).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

function idempotencyKey(claimId: string, content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) hash = (Math.imul(31, hash) + content.charCodeAt(i)) | 0;
  return `dra-${claimId}-${(hash >>> 0).toString(36)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    // Identify the caller from their JWT.
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { claimId, to, subject, body, threadId } = await req.json();

    const { data: claimRow } = await admin.from("claims").select("data").eq("id", claimId).eq("owner_id", user.id).single();
    if (!claimRow) return json({ error: "claim not found" }, 404);

    const { data: settingsRow } = await admin.from("app_settings").select("data").eq("owner_id", user.id).single();
    const settings = settingsRow?.data ?? { companyName: "Detention Recover AI", companyEmail: "recover@detentionrecover.ai" };

    const thread = threadId || `claim-${claimId}`;
    const idemKey = idempotencyKey(claimId, subject + body);

    // Send via Resend with backoff on transient failures.
    let sendJson: { id?: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify({
          from: `${settings.companyName} <${settings.companyEmail}>`,
          to,
          subject,
          text: body,
          headers: {
            "X-DRA-Claim-Id": claimId,
            "X-DRA-Thread-Id": thread,
            References: `<${thread}@detentionrecover.ai>`,
          },
        }),
      });
      if (res.ok) { sendJson = await res.json(); break; }
      if (res.status < 500) return json({ error: await res.text() }, res.status);
      await new Promise((r) => setTimeout(r, Math.min(2000 * 2 ** attempt, 8000)));
    }
    if (!sendJson) return json({ error: "send failed after retries" }, 502);

    const nowIso = new Date().toISOString();
    await admin.from("emails").insert({
      owner_id: user.id,
      claim_id: claimId,
      provider_message_id: sendJson.id ?? idemKey,
      direction: "outbound",
      read: true,
      data: {
        id: crypto.randomUUID(),
        claimId, providerMessageId: sendJson.id ?? idemKey, threadId: thread,
        direction: "outbound", from: settings.companyEmail, to, subject, body,
        sentAt: nowIso, read: true, createdAt: nowIso, updatedAt: nowIso, ownerId: user.id,
      },
    });

    return json({ id: sendJson.id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
