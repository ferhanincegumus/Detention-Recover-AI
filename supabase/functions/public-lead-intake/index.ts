// Edge Function: public-lead-intake
// Public endpoint the landing-page case form posts to. Creates a CaseLead owned
// by the single admin (ADMIN_USER_ID), logs an activity, and dedupes recent
// duplicate submissions. Rate-limited per IP.
//
// Secrets: ADMIN_USER_ID (the admin's auth user id). SUPABASE_URL /
// SERVICE_ROLE_KEY auto-injected.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const WINDOW_MS = 60_000;
const rateHits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string, limit = 5, now = Date.now()): boolean {
  const entry = rateHits.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    rateHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "too many requests" }, 429);

  const ownerId = Deno.env.get("ADMIN_USER_ID");
  if (!ownerId) return json({ error: "ADMIN_USER_ID not configured" }, 500);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const b = await req.json();
    if (!b.companyName || !b.phone || !b.email || !b.brokerName) {
      return json({ error: "missing required fields" }, 400);
    }

    // Dedupe a recent identical submission.
    const { data: recent } = await admin
      .from("leads")
      .select("id, created_at")
      .eq("owner_id", ownerId)
      .eq("email", b.email)
      .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());
    const dup = (recent ?? []).length > 0 ? recent![0] : null;
    if (dup) return json({ id: dup.id, deduped: true });

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const lead = {
      id,
      companyName: b.companyName, contactName: b.contactName ?? "", phone: normalizePhone(b.phone),
      email: b.email, brokerName: b.brokerName, loadCount: b.loadCount ?? "1",
      estimatedAmount: b.estimatedAmount ? Number(b.estimatedAmount) : undefined,
      details: b.details ?? "", status: "new", source: "landing", tags: [], notes: [],
      linkedClaimId: null, lastContactedAt: null, createdAt: nowIso, updatedAt: nowIso, ownerId,
    };

    await admin.from("leads").insert({ id, owner_id: ownerId, status: "new", email: b.email, data: lead });
    await admin.from("activities").insert({
      owner_id: ownerId, type: "lead_created",
      data: { id: crypto.randomUUID(), type: "lead_created", title: `New case lead: ${b.companyName}`, description: `${b.contactName ?? ""} · ${b.brokerName}`, leadId: id, automated: false, createdAt: nowIso, updatedAt: nowIso, ownerId },
    });

    return json({ id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
