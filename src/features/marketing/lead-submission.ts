import { uid, sleep } from "@/lib/utils";
import { normalizePhone } from "@/lib/format";
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
export async function submitPublicLead(input: CaseLeadInput): Promise<PublicLeadRecord> {
  await sleep(650); // simulated network latency for realistic UX

  const queue = readQueue();
  const normalizedPhone = normalizePhone(input.phone);

  const recentDuplicate = queue.find(
    (lead) =>
      lead.email.toLowerCase() === input.email.toLowerCase() &&
      lead.brokerName.toLowerCase() === input.brokerName.toLowerCase() &&
      Date.now() - new Date(lead.submittedAt).getTime() < 60_000,
  );
  if (recentDuplicate) return recentDuplicate;

  const record: PublicLeadRecord = {
    ...input,
    phone: normalizedPhone,
    id: uid("lead"),
    submittedAt: new Date().toISOString(),
    source: "landing",
  };

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
