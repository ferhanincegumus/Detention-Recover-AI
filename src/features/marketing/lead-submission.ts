import { uid, sleep } from "@/lib/utils";
import { normalizePhone } from "@/lib/format";
import { isSupabaseBackend } from "@/config/env";
import type { LeadAttachment } from "@/types/lead";
import {
  PUBLIC_LEADS_STORAGE_KEY,
  type CaseLeadInput,
  type PublicLeadRecord,
} from "@/features/marketing/lead-schema";

function readQueue(): PublicLeadRecord[] {
  try {
    const raw = localStorage.getItem(PUBLIC_LEADS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PublicLeadRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Submit a public case lead. Persists to a shared local queue that the admin
 * app ingests as Case Leads. Idempotent per (email + broker) within a short
 * window to prevent double-submits.
 */
export async function submitPublicLead(
  input: CaseLeadInput,
  attachments: LeadAttachment[] = [],
): Promise<PublicLeadRecord> {
  const record: PublicLeadRecord = {
    ...input,
    phone: normalizePhone(input.phone),
    id: uid("lead"),
    submittedAt: new Date().toISOString(),
    source: "landing",
    attachments,
  };

  // Supabase: post to the public-lead-intake Edge Function (service role).
  if (isSupabaseBackend) {
    const { functionsBaseUrl } = await import("@/services/supabase/client");
    const { env } = await import("@/config/env");
    const res = await fetch(`${functionsBaseUrl()}/public-lead-intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Public anon key satisfies the Supabase gateway; the function itself
        // requires no JWT (verify_jwt = false).
        apikey: env.supabase.anonKey,
        Authorization: `Bearer ${env.supabase.anonKey}`,
      },
      body: JSON.stringify({ ...input, attachments }),
    });
    if (!res.ok) throw new Error(`Lead submission failed (${res.status})`);
    const body = (await res.json()) as { id?: string };
    return { ...record, id: body.id ?? record.id };
  }

  await sleep(650); // simulated network latency for realistic UX

  const queue = readQueue();

  const recentDuplicate = queue.find(
    (lead) =>
      lead.email.toLowerCase() === input.email.toLowerCase() &&
      lead.brokerName.toLowerCase() === input.brokerName.toLowerCase() &&
      Date.now() - new Date(lead.submittedAt).getTime() < 60_000,
  );
  if (recentDuplicate) return recentDuplicate;

  try {
    localStorage.setItem(PUBLIC_LEADS_STORAGE_KEY, JSON.stringify([record, ...queue]));
  } catch {
    /* storage unavailable — the record still returns for the success screen */
  }

  return record;
}

export function readPublicLeads(): PublicLeadRecord[] {
  return readQueue();
}
