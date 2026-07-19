import { getDb } from "@/services/backend/store";
import { matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import { routes } from "@/config/routes";

export type SearchResultType = "claim" | "load" | "broker" | "lead";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  to: string;
}

/** Global search across claims, loads, brokers, and leads (by name/phone/email/ref). */
export async function globalSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return withLatency([]);
  const db = getDb();
  const results: SearchResult[] = [];

  db.claims
    .filter(notDeleted)
    .filter((c) => matchesSearch(q, c.claimNumber, c.brokerName, c.loadReference, c.customerName))
    .slice(0, limit)
    .forEach((c) =>
      results.push({
        id: c.id,
        type: "claim",
        title: `${c.claimNumber} · ${c.brokerName}`,
        subtitle: `Claim · ${c.loadReference}`,
        to: routes.claimDetail(c.id),
      }),
    );

  db.loads
    .filter(notDeleted)
    .filter((l) => matchesSearch(q, l.referenceNumber, l.brokerName, l.customerName, l.driverName))
    .slice(0, limit)
    .forEach((l) =>
      results.push({
        id: l.id,
        type: "load",
        title: `${l.referenceNumber} · ${l.brokerName}`,
        subtitle: `Load · ${l.customerName ?? "—"}`,
        to: routes.loadDetail(l.id),
      }),
    );

  db.brokers
    .filter(notDeleted)
    .filter((b) => matchesSearch(q, b.name, b.mcNumber, b.email))
    .slice(0, limit)
    .forEach((b) =>
      results.push({
        id: b.id,
        type: "broker",
        title: b.name,
        subtitle: `Broker · ${b.intel.totalClaims} claims`,
        to: routes.brokerDetail(b.id),
      }),
    );

  db.leads
    .filter(notDeleted)
    .filter((l) => matchesSearch(q, l.companyName, l.contactName, l.email, l.phone, l.brokerName))
    .slice(0, limit)
    .forEach((l) =>
      results.push({
        id: l.id,
        type: "lead",
        title: l.companyName,
        subtitle: `Lead · ${l.contactName}`,
        to: routes.leadDetail(l.id),
      }),
    );

  return withLatency(results.slice(0, limit * 2));
}
