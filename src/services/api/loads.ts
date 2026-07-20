import { getDb, mutate } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { byDateDesc, matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import { calculateDetention, detectMissingDocuments } from "@/services/domain/detention";
import { calculateChargeAmount } from "@/services/domain/charges";
import { scoreLoadStrength, estimateRecoveryProbability } from "@/services/domain/risk";
import { calculateCommission } from "@/services/domain/commission";
import { uid } from "@/lib/utils";
import type { ID, ListParams } from "@/types/common";
import { ChargeType } from "@/types/common";
import type { Load, LoadStop } from "@/types/load";
import { ClaimStatus, type Claim } from "@/types/claim";
import { ActivityType } from "@/types/communication";
import { logActivity } from "@/services/api/activity";

export interface LoadFilters extends ListParams {
  brokerId?: string;
  hasClaim?: boolean;
  riskLevel?: string;
}

export interface LoadInput {
  referenceNumber: string;
  brokerId?: string;
  brokerName: string;
  customerName?: string;
  customerPhone?: string;
  driverName?: string;
  chargeType: ChargeType;
  freeHours: number;
  ratePerHour: number;
  stops: Omit<LoadStop, "id">[];
  layoverNights?: number;
  layoverNightlyRate?: number;
  tonuAmount?: number;
  accessorialAmount?: number;
  accessorialDescription?: string;
  documents: Load["documents"];
  notes?: string;
}

type DerivedLoad = Pick<
  Load,
  | "stops"
  | "billableDetentionHours"
  | "detentionAmount"
  | "chargeAmount"
  | "chargeBasis"
  | "missingDocuments"
  | "riskScore"
  | "riskLevel"
>;

/** Derive computed charge/detention/risk fields from raw load inputs. */
function deriveLoad(input: LoadInput): DerivedLoad {
  const stops: LoadStop[] = input.stops.map((s) => ({ ...s, id: uid("stop") }));
  const detention = calculateDetention(stops, input.freeHours, input.ratePerHour);
  const charge = calculateChargeAmount({
    chargeType: input.chargeType,
    detentionAmount: detention.amount,
    layoverNights: input.layoverNights,
    layoverNightlyRate: input.layoverNightlyRate,
    tonuAmount: input.tonuAmount,
    accessorialAmount: input.accessorialAmount,
  });
  const missingDocuments = detectMissingDocuments({ documents: input.documents, stops }, input.chargeType);
  const strength = scoreLoadStrength({
    chargeType: input.chargeType,
    documents: input.documents,
    billableDetentionHours: detention.billableHours,
    chargeAmount: charge.amount,
    missingDocuments,
  });
  return {
    stops,
    billableDetentionHours: detention.billableHours,
    detentionAmount: detention.amount,
    chargeAmount: charge.amount,
    chargeBasis: charge.basis,
    missingDocuments,
    riskScore: strength.score,
    riskLevel: strength.level,
  };
}

function applyFilters(loads: Load[], filters?: LoadFilters): Load[] {
  return loads
    .filter(notDeleted)
    .filter((l) => {
      if (!filters) return true;
      if (filters.brokerId && l.brokerId !== filters.brokerId) return false;
      if (filters.riskLevel && l.riskLevel !== filters.riskLevel) return false;
      if (filters.hasClaim === true && !l.claimId) return false;
      if (filters.hasClaim === false && l.claimId) return false;
      return matchesSearch(filters.search, l.referenceNumber, l.brokerName, l.customerName, l.driverName);
    })
    .sort(byDateDesc((l) => l.updatedAt));
}

export const loadsApi = {
  async list(filters?: LoadFilters): Promise<Load[]> {
    return withLatency(applyFilters(getDb().loads, filters));
  },

  async get(id: ID): Promise<Load | undefined> {
    return withLatency(getDb().loads.find((l) => l.id === id && notDeleted(l)));
  },

  async create(input: LoadInput): Promise<Load> {
    return withLatency(
      mutate((db) => {
        const nowIso = new Date().toISOString();
        const load: Load = {
          id: uid("load"),
          referenceNumber: input.referenceNumber,
          brokerId: input.brokerId,
          brokerName: input.brokerName,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          driverName: input.driverName,
          chargeType: input.chargeType,
          freeHours: input.freeHours,
          ratePerHour: input.ratePerHour,
          layoverNights: input.layoverNights,
          layoverNightlyRate: input.layoverNightlyRate,
          tonuAmount: input.tonuAmount,
          accessorialAmount: input.accessorialAmount,
          accessorialDescription: input.accessorialDescription,
          documents: input.documents,
          notes: input.notes ?? "",
          claimId: null,
          ...deriveLoad(input),
          createdAt: nowIso,
          updatedAt: nowIso,
          ownerId: OWNER_ID,
        };
        db.loads = [load, ...db.loads];
        logActivity(db, {
          type: ActivityType.LoadCreated,
          title: `Load ${load.referenceNumber} added`,
          description: `${load.brokerName} · ${load.customerName ?? "—"}`,
          loadId: load.id,
          automated: false,
        });
        return load;
      }),
    );
  },

  async update(id: ID, input: LoadInput): Promise<Load> {
    return withLatency(
      mutate((db) => {
        const load = db.loads.find((l) => l.id === id);
        if (!load) throw new Error(`Load ${id} not found`);
        Object.assign(load, input, deriveLoad(input), { updatedAt: new Date().toISOString() });
        return load;
      }),
    );
  },

  async remove(id: ID): Promise<void> {
    return withLatency(
      mutate((db) => {
        const load = db.loads.find((l) => l.id === id);
        if (load) load.deletedAt = new Date().toISOString();
      }),
    );
  },

  /**
   * Generate a claim from a load. Idempotent — returns the existing claim if
   * one has already been created for this load.
   */
  async createClaim(id: ID): Promise<Claim> {
    return withLatency(
      mutate((db) => {
        const load = db.loads.find((l) => l.id === id);
        if (!load) throw new Error(`Load ${id} not found`);

        if (load.claimId) {
          const existing = db.claims.find((c) => c.id === load.claimId);
          if (existing) return existing;
        }

        const nowIso = new Date().toISOString();
        const broker = db.brokers.find((b) => b.id === load.brokerId);
        const commission = calculateCommission(0, db.settings.defaultCommissionRate);
        const claim: Claim = {
          id: uid("claim"),
          claimNumber: `CLM-${2600 + db.claims.length + 1}`,
          loadId: load.id,
          loadReference: load.referenceNumber,
          brokerId: load.brokerId,
          brokerName: load.brokerName,
          customerName: load.customerName,
          customerPhone: load.customerPhone,
          chargeType: load.chargeType,
          status: ClaimStatus.Draft,
          claimedAmount: load.chargeAmount,
          recoveredAmount: 0,
          settlementOffer: null,
          commissionRate: db.settings.defaultCommissionRate,
          commissionAmount: commission.commissionAmount,
          carrierPayout: commission.carrierPayout,
          sentAt: null,
          firstReplyAt: null,
          resolvedAt: null,
          paidAt: null,
          daysToRecover: null,
          recoveryProbability: estimateRecoveryProbability({
            brokerRecoveryRate: broker?.intel.recoveryRate ?? 70,
            loadStrengthScore: load.riskScore,
            hasCompleteEvidence: load.missingDocuments.length === 0,
          }),
          predictedPaymentDate: null,
          timeline: [
            {
              id: uid("tl"),
              at: nowIso,
              status: ClaimStatus.Draft,
              title: "Claim drafted from load",
              automated: false,
            },
          ],
          evidenceIds: db.documents.filter((d) => d.loadId === load.id).map((d) => d.id),
          tags: [],
          notes: "",
          archived: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          ownerId: OWNER_ID,
        };
        db.claims = [claim, ...db.claims];
        load.claimId = claim.id;
        load.updatedAt = nowIso;

        logActivity(db, {
          type: ActivityType.ClaimCreated,
          title: `Claim ${claim.claimNumber} created`,
          description: `From load ${load.referenceNumber} · ${load.brokerName}`,
          claimId: claim.id,
          loadId: load.id,
          automated: false,
        });
        return claim;
      }),
    );
  },
};
