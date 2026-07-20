// Edge Function: resend-inbound
// Resend inbound-email webhook. Verifies a shared secret, routes the broker
// reply to the right Claim by our custom header, stores it as an inbound
// EmailMessage (unread), and dedupes by provider message id (idempotent).
//
// Secrets: INBOUND_WEBHOOK_SECRET (compared against the `?secret=` query param
// or `x-webhook-secret` header). SUPABASE_URL / SERVICE_ROLE_KEY auto-injected.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, safeEqual } from "../_shared/cors.ts";

function claimIdFromHeaders(headers: Record<string, string> = {}): string | null {
  const direct = headers["X-DRA-Claim-Id"] ?? headers["x-dra-claim-id"];
  if (direct) return direct;
  const refs = headers["References"] ?? headers["references"] ?? "";
  const m = refs.match(/claim-([a-z0-9_-]+)@/i);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("INBOUND_WEBHOOK_SECRET") ?? "";
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEqual(secret, provided)) return json({ error: "invalid secret" }, 401);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const event = await req.json();
    const payload = event.data ?? event;
    const messageId: string | undefined = payload.message_id ?? payload.email_id ?? payload.id;
    if (!messageId) return json({ error: "missing message id" }, 400);

    const headers = payload.headers ?? {};
    const claimId = claimIdFromHeaders(headers);
    if (!claimId) return json({ ok: true, note: "no matching claim" });

    const { data: claimRow } = await admin.from("claims").select("owner_id, data").eq("id", claimId).single();
    if (!claimRow) return json({ ok: true, note: "claim not found" });

    // Idempotency: skip if we've stored this provider message already.
    const { data: existing } = await admin
      .from("emails")
      .select("id")
      .eq("owner_id", claimRow.owner_id)
      .eq("provider_message_id", messageId)
      .maybeSingle();
    if (existing) return json({ deduped: true });

    const body: string = payload.text ?? payload.html ?? "";
    const nowIso = new Date().toISOString();

    await admin.from("emails").insert({
      owner_id: claimRow.owner_id,
      claim_id: claimId,
      provider_message_id: messageId,
      direction: "inbound",
      read: false,
      data: {
        id: crypto.randomUUID(),
        claimId, providerMessageId: messageId,
        threadId: headers["X-DRA-Thread-Id"] ?? `claim-${claimId}`,
        direction: "inbound", from: payload.from ?? "", to: payload.to ?? "",
        subject: payload.subject ?? "", body, sentAt: nowIso,
        read: false, createdAt: nowIso, updatedAt: nowIso, ownerId: claimRow.owner_id,
      },
    });

    // Advance the claim + log activity.
    const claimData = claimRow.data as Record<string, unknown>;
    if (claimData.status === "sent") {
      await admin.from("claims").update({ status: "broker_replied", data: { ...claimData, status: "broker_replied", firstReplyAt: claimData.firstReplyAt ?? nowIso, updatedAt: nowIso } }).eq("id", claimId);
    }
    await admin.from("activities").insert({
      owner_id: claimRow.owner_id,
      type: "broker_replied",
      data: { id: crypto.randomUUID(), type: "broker_replied", title: `Broker replied on ${claimData.claimNumber ?? claimId}`, claimId, automated: true, createdAt: nowIso, updatedAt: nowIso, ownerId: claimRow.owner_id },
    });

    return json({ ok: true, claimId });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
