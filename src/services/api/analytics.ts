import { getDb } from "@/services/backend/store";
import { withLatency } from "@/services/api/helpers";
import { average, sumBy } from "@/lib/utils";
import { startOfMonth, startOfYear, subMonths, format, isAfter, parseISO } from "date-fns";
import {
  ClaimStatus,
  OPEN_CLAIM_STATUSES,
  type Claim,
} from "@/types/claim";
import { MessageDirection } from "@/types/communication";
import type { USD } from "@/types/common";

export interface DashboardStats {
  recoveredThisMonth: USD;
  recoveredThisYear: USD;
  monthlyRevenue: USD;
  openClaims: number;
  pendingReplies: number;
  needsAttention: number;
  upcomingFollowups: number;
  avgRecoveryDays: number;
  totalRecovered: USD;
  activeCarriers: number;
}

export interface MonthlyPoint {
  month: string;
  recovered: USD;
  commission: USD;
  claims: number;
}

export interface RankingRow {
  name: string;
  recovered: USD;
  claims: number;
}

export interface AiRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  claimId?: string;
}

function paidClaims(claims: Claim[]): Claim[] {
  return claims.filter((c) => c.status === ClaimStatus.Paid && !c.deletedAt);
}

export const analyticsApi = {
  async dashboard(): Promise<DashboardStats> {
    const db = getDb();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);
    const paid = paidClaims(db.claims);

    const recoveredThisMonth = sumBy(
      paid.filter((c) => c.paidAt && isAfter(parseISO(c.paidAt), monthStart)),
      (c) => c.recoveredAmount,
    );
    const recoveredThisYear = sumBy(
      paid.filter((c) => c.paidAt && isAfter(parseISO(c.paidAt), yearStart)),
      (c) => c.recoveredAmount,
    );
    const monthlyRevenue = sumBy(
      paid.filter((c) => c.paidAt && isAfter(parseISO(c.paidAt), monthStart)),
      (c) => c.commissionAmount,
    );

    const open = db.claims.filter((c) => !c.deletedAt && OPEN_CLAIM_STATUSES.includes(c.status));
    const pendingReplies = db.emails.filter(
      (e) => e.direction === MessageDirection.Inbound && !e.read,
    ).length;
    const needsAttention = db.claims.filter(
      (c) => !c.deletedAt && (c.tags.includes("needs-attention") || c.status === ClaimStatus.BrokerReplied),
    ).length;
    const upcomingFollowups = db.followups.filter((f) => f.status === "scheduled").length;
    const avgRecoveryDays = Math.round(
      average(paid.map((c) => c.daysToRecover ?? 0).filter((d) => d > 0)),
    );
    const activeCarriers = new Set(open.map((c) => c.customerName).filter(Boolean)).size;

    return withLatency({
      recoveredThisMonth,
      recoveredThisYear,
      monthlyRevenue,
      openClaims: open.length,
      pendingReplies,
      needsAttention,
      upcomingFollowups,
      avgRecoveryDays,
      totalRecovered: sumBy(paid, (c) => c.recoveredAmount),
      activeCarriers,
    });
  },

  async monthlyTrend(months = 6): Promise<MonthlyPoint[]> {
    const db = getDb();
    const paid = paidClaims(db.claims);
    const now = new Date();
    const points: MonthlyPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, "yyyy-MM");
      const inMonth = paid.filter((c) => c.paidAt && format(parseISO(c.paidAt), "yyyy-MM") === key);
      points.push({
        month: format(monthDate, "MMM"),
        recovered: sumBy(inMonth, (c) => c.recoveredAmount),
        commission: sumBy(inMonth, (c) => c.commissionAmount),
        claims: inMonth.length,
      });
    }
    return withLatency(points);
  },

  async brokerRanking(limit = 5): Promise<RankingRow[]> {
    const rows = getDb()
      .brokers.filter((b) => !b.deletedAt && b.intel.recoveredAmount > 0)
      .map((b) => ({ name: b.name, recovered: b.intel.recoveredAmount, claims: b.intel.totalClaims }))
      .sort((a, b) => b.recovered - a.recovered)
      .slice(0, limit);
    return withLatency(rows);
  },

  async customerRanking(limit = 5): Promise<RankingRow[]> {
    const paid = paidClaims(getDb().claims);
    const byCustomer = new Map<string, RankingRow>();
    paid.forEach((c) => {
      const name = c.customerName ?? "Unknown";
      const row = byCustomer.get(name) ?? { name, recovered: 0, claims: 0 };
      row.recovered += c.recoveredAmount;
      row.claims += 1;
      byCustomer.set(name, row);
    });
    const rows = [...byCustomer.values()].sort((a, b) => b.recovered - a.recovered).slice(0, limit);
    return withLatency(rows);
  },

  /** Simple linear forecast of next month's recovery from the trailing trend. */
  async forecastNextMonth(): Promise<USD> {
    const trend = await this.monthlyTrend(4);
    const values = trend.map((p) => p.recovered).filter((v) => v > 0);
    if (values.length === 0) return withLatency(0);
    const avg = average(values);
    const momentum = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
    return withLatency(Math.max(0, Math.round(avg + momentum * 0.25)));
  },

  /** Rule-based "AI recommendations" derived from the current pipeline state. */
  async recommendations(): Promise<AiRecommendation[]> {
    const db = getDb();
    const recs: AiRecommendation[] = [];

    db.claims
      .filter((c) => !c.deletedAt && c.status === ClaimStatus.BrokerReplied)
      .slice(0, 3)
      .forEach((c) =>
        recs.push({
          id: `rec_reply_${c.id}`,
          title: `Reply to ${c.brokerName} on ${c.claimNumber}`,
          detail: "Broker replied and is awaiting your response. An AI draft is ready to review.",
          priority: "high",
          claimId: c.id,
        }),
      );

    db.claims
      .filter((c) => !c.deletedAt && c.status === ClaimStatus.SettlementOffered)
      .slice(0, 2)
      .forEach((c) =>
        recs.push({
          id: `rec_settle_${c.id}`,
          title: `Review settlement on ${c.claimNumber}`,
          detail: `${c.brokerName} offered $${(c.settlementOffer ?? 0).toLocaleString()} against a $${c.claimedAmount.toLocaleString()} claim.`,
          priority: "high",
          claimId: c.id,
        }),
      );

    const staleSent = db.claims.filter(
      (c) => !c.deletedAt && c.status === ClaimStatus.Sent && c.sentAt,
    );
    if (staleSent.length > 0) {
      recs.push({
        id: "rec_followups",
        title: `Schedule follow-ups for ${staleSent.length} sent claim${staleSent.length > 1 ? "s" : ""}`,
        detail: "These claims were sent but have no reply yet. A 7-day follow-up increases recovery odds.",
        priority: "medium",
      });
    }

    const missingEvidence = db.loads.filter((l) => !l.deletedAt && l.missingDocuments.length > 0 && !l.claimId);
    if (missingEvidence.length > 0) {
      recs.push({
        id: "rec_evidence",
        title: `${missingEvidence.length} load${missingEvidence.length > 1 ? "s" : ""} missing evidence`,
        detail: "Collect the missing documents to strengthen these claims before sending.",
        priority: "low",
      });
    }

    return withLatency(recs.slice(0, 6));
  },
};
