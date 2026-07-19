import { getDb, mutate } from "@/services/backend/store";
import { byDateDesc, withLatency } from "@/services/api/helpers";
import type { ID } from "@/types/common";
import { MessageDirection, ReplyClassification, type EmailMessage } from "@/types/communication";

export interface InboxItem extends EmailMessage {
  claimNumber?: string;
}

/** Detected recovery opportunity found by scanning the connected mailbox. */
export interface RecoveryOpportunity {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  detectedType: "detention" | "layover" | "tonu" | "accessorial" | "invoice";
  estimatedAmount: number;
  receivedAt: string;
}

export const inboxApi = {
  /** Threaded emails for the recovery inbox, newest first. */
  async list(): Promise<InboxItem[]> {
    const db = getDb();
    const items = db.emails
      .filter((e) => e.direction === MessageDirection.Inbound)
      .map<InboxItem>((e) => ({
        ...e,
        claimNumber: db.claims.find((c) => c.id === e.claimId)?.claimNumber,
      }))
      .sort(byDateDesc((e) => e.sentAt));
    return withLatency(items);
  },

  /** Full email thread for a claim, oldest first. */
  async threadForClaim(claimId: ID): Promise<EmailMessage[]> {
    const items = getDb()
      .emails.filter((e) => e.claimId === claimId)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    return withLatency(items);
  },

  async markRead(id: ID): Promise<void> {
    return withLatency(
      mutate((db) => {
        const email = db.emails.find((e) => e.id === id);
        if (email) email.read = true;
      }),
    );
  },

  /**
   * Simulated mailbox scan that surfaces unclaimed recovery opportunities.
   * In production this is a Base44 function reading the connected mailbox.
   */
  async scan(): Promise<RecoveryOpportunity[]> {
    const opportunities: RecoveryOpportunity[] = [
      {
        id: "opp_1",
        from: "billing@midwestbrokers.com",
        subject: "RE: Load 88213 — waiting on lumper + detention",
        snippet: "Driver sat 4.5 hours at the DC before they got him to a door…",
        detectedType: "detention",
        estimatedAmount: 187,
        receivedAt: new Date().toISOString(),
      },
      {
        id: "opp_2",
        from: "ops@sunrisefreight.com",
        subject: "Layover approved — Load 77120",
        snippet: "We can approve the layover for the overnight in Laredo…",
        detectedType: "layover",
        estimatedAmount: 250,
        receivedAt: new Date().toISOString(),
      },
      {
        id: "opp_3",
        from: "dispatch@coyote.com",
        subject: "TONU — Load cancelled at pickup",
        snippet: "Shipper cancelled after arrival. Please invoice TONU per rate con…",
        detectedType: "tonu",
        estimatedAmount: 150,
        receivedAt: new Date().toISOString(),
      },
    ];
    return withLatency(opportunities);
  },
};

export { ReplyClassification };
