import { getDb, mutate } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { byDateDesc, matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import { calculateCommission } from "@/services/domain/commission";
import { uid } from "@/lib/utils";
import { daysBetween } from "@/lib/format";
import {
  ClaimStatus,
  CLAIM_STATUS_META,
  OPEN_CLAIM_STATUSES,
  type Claim,
  type ClaimTimelineEvent,
} from "@/types/claim";
import type { ID, ListParams } from "@/types/common";
import { ActivityType, SmsEvent, MessageDirection, type SmsMessage } from "@/types/communication";
import { logActivity } from "@/services/api/activity";
import { buildMilestoneMessage } from "@/services/integrations/messaging";
import type { Database } from "@/services/backend/store";

/** Status → customer SMS milestone map (drives the automated notifications). */
const STATUS_SMS_EVENT: Partial<Record<ClaimStatus, SmsEvent>> = {
  [ClaimStatus.Sent]: SmsEvent.ClaimSent,
  [ClaimStatus.BrokerReplied]: SmsEvent.BrokerReplied,
  [ClaimStatus.SettlementOffered]: SmsEvent.SettlementOffered,
  [ClaimStatus.Closed]: SmsEvent.CaseClosed,
};

/**
 * Queue a milestone SMS to the customer. Idempotent per (claim, event) so
 * re-transitioning a status never double-texts.
 */
function queueMilestoneSms(db: Database, claim: Claim, event: SmsEvent): void {
  if (!claim.customerPhone) return;
  const already = db.messages.some((m) => m.claimId === claim.id && m.event === event);
  if (already) return;

  const nowIso = new Date().toISOString();
  const message: SmsMessage = {
    id: uid("sms"),
    channel: "sms",
    direction: MessageDirection.Outbound,
    to: claim.customerPhone,
    from: db.settings.companyPhone,
    body: buildMilestoneMessage(event, {
      companyName: db.settings.companyName,
      brokerName: claim.brokerName,
      claimNumber: claim.claimNumber,
      amount: event === SmsEvent.Paid ? claim.recoveredAmount : (claim.settlementOffer ?? undefined),
    }),
    event,
    claimId: claim.id,
    status: "delivered",
    createdAt: nowIso,
    updatedAt: nowIso,
    ownerId: OWNER_ID,
  };
  db.messages = [message, ...db.messages];
  logActivity(db, {
    type: ActivityType.SmsSent,
    title: `SMS to ${claim.customerName ?? "customer"}`,
    description: message.body,
    claimId: claim.id,
    automated: true,
  });
}

export interface ClaimFilters extends ListParams {
  status?: ClaimStatus | "all" | "open";
  brokerId?: string;
  chargeType?: string;
  minAmount?: number;
  tag?: string;
}

function applyFilters(claims: Claim[], filters?: ClaimFilters): Claim[] {
  return claims
    .filter(notDeleted)
    .filter((c) => {
      if (!filters) return true;
      if (filters.status === "open" && !OPEN_CLAIM_STATUSES.includes(c.status)) return false;
      if (filters.status && filters.status !== "all" && filters.status !== "open" && c.status !== filters.status)
        return false;
      if (filters.brokerId && c.brokerId !== filters.brokerId) return false;
      if (filters.chargeType && c.chargeType !== filters.chargeType) return false;
      if (filters.minAmount != null && c.claimedAmount < filters.minAmount) return false;
      if (filters.tag && !c.tags.includes(filters.tag)) return false;
      return matchesSearch(
        filters.search,
        c.claimNumber,
        c.brokerName,
        c.loadReference,
        c.customerName,
      );
    })
    .sort(byDateDesc((c) => c.updatedAt));
}

export const claimsApi = {
  async list(filters?: ClaimFilters): Promise<Claim[]> {
    return withLatency(applyFilters(getDb().claims, filters));
  },

  async get(id: ID): Promise<Claim | undefined> {
    return withLatency(getDb().claims.find((c) => c.id === id && notDeleted(c)));
  },

  async update(id: ID, patch: Partial<Claim>): Promise<Claim> {
    return withLatency(
      mutate((db) => {
        const claim = db.claims.find((c) => c.id === id);
        if (!claim) throw new Error(`Claim ${id} not found`);
        Object.assign(claim, patch, { updatedAt: new Date().toISOString() });
        return claim;
      }),
    );
  },

  /** Transition a claim's status, appending a timeline event idempotently. */
  async setStatus(id: ID, status: ClaimStatus, note?: string): Promise<Claim> {
    return withLatency(
      mutate((db) => {
        const claim = db.claims.find((c) => c.id === id);
        if (!claim) throw new Error(`Claim ${id} not found`);
        if (claim.status === status) return claim;

        const nowIso = new Date().toISOString();
        claim.status = status;
        claim.updatedAt = nowIso;

        const event: ClaimTimelineEvent = {
          id: uid("tl"),
          at: nowIso,
          status,
          title: `Status → ${CLAIM_STATUS_META[status].label}`,
          description: note,
          automated: false,
        };
        claim.timeline = [...claim.timeline, event];

        if (status === ClaimStatus.Sent && !claim.sentAt) claim.sentAt = nowIso;

        logActivity(db, {
          type: ActivityType.ClaimStatusChanged,
          title: `Claim ${claim.claimNumber} → ${CLAIM_STATUS_META[status].label}`,
          claimId: claim.id,
          automated: false,
        });

        // Automated customer SMS on milestone statuses.
        const smsEvent = STATUS_SMS_EVENT[status];
        if (smsEvent) queueMilestoneSms(db, claim, smsEvent);
        return claim;
      }),
    );
  },

  /** Record a recovered payment, computing commission + payout and closing out. */
  async markPaid(id: ID, recoveredAmount: number): Promise<Claim> {
    return withLatency(
      mutate((db) => {
        const claim = db.claims.find((c) => c.id === id);
        if (!claim) throw new Error(`Claim ${id} not found`);

        const nowIso = new Date().toISOString();
        const commission = calculateCommission(recoveredAmount, claim.commissionRate);
        claim.recoveredAmount = commission.recoveredAmount;
        claim.commissionAmount = commission.commissionAmount;
        claim.carrierPayout = commission.carrierPayout;
        claim.status = ClaimStatus.Paid;
        claim.paidAt = nowIso;
        claim.resolvedAt = nowIso;
        claim.daysToRecover = claim.sentAt ? daysBetween(claim.sentAt, nowIso) : null;
        claim.updatedAt = nowIso;
        claim.timeline = [
          ...claim.timeline,
          {
            id: uid("tl"),
            at: nowIso,
            status: ClaimStatus.Paid,
            title: "Payment received",
            description: `Recovered $${recoveredAmount.toLocaleString()}.`,
            automated: false,
          },
        ];

        // Cancel any outstanding follow-ups for this claim (idempotent).
        db.followups
          .filter((f) => f.claimId === id && f.status === "scheduled")
          .forEach((f) => (f.status = "cancelled"));

        logActivity(db, {
          type: ActivityType.PaymentReceived,
          title: `Payment received — ${claim.claimNumber}`,
          description: `Recovered $${recoveredAmount.toLocaleString()} from ${claim.brokerName}.`,
          claimId: claim.id,
          automated: false,
        });

        // Celebrate with the customer.
        queueMilestoneSms(db, claim, SmsEvent.Paid);
        return claim;
      }),
    );
  },

  async remove(id: ID): Promise<void> {
    return withLatency(
      mutate((db) => {
        const claim = db.claims.find((c) => c.id === id);
        if (claim) claim.deletedAt = new Date().toISOString();
      }),
    );
  },
};

export { OWNER_ID };
