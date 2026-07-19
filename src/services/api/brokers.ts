import { getDb, mutate } from "@/services/backend/store";
import { matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import type { ID, ListParams } from "@/types/common";
import type { Broker, BrokerLeaderboardRow } from "@/types/broker";

export interface BrokerFilters extends ListParams {
  riskLevel?: string;
}

export const brokersApi = {
  async list(filters?: BrokerFilters): Promise<Broker[]> {
    const items = getDb()
      .brokers.filter(notDeleted)
      .filter((b) => {
        if (filters?.riskLevel && b.intel.riskLevel !== filters.riskLevel) return false;
        return matchesSearch(filters?.search, b.name, b.mcNumber, b.email);
      })
      .sort((a, b) => b.intel.recoveredAmount - a.intel.recoveredAmount);
    return withLatency(items);
  },

  async get(id: ID): Promise<Broker | undefined> {
    return withLatency(getDb().brokers.find((b) => b.id === id && notDeleted(b)));
  },

  async leaderboard(): Promise<BrokerLeaderboardRow[]> {
    const rows = getDb()
      .brokers.filter(notDeleted)
      .filter((b) => b.intel.totalClaims > 0)
      .map<BrokerLeaderboardRow>((b) => ({
        brokerId: b.id,
        name: b.name,
        recoveredAmount: b.intel.recoveredAmount,
        recoveryRate: b.intel.recoveryRate,
        avgPaymentDays: b.intel.avgPaymentDays,
        totalClaims: b.intel.totalClaims,
        riskLevel: b.intel.riskLevel,
      }))
      .sort((a, b) => b.recoveredAmount - a.recoveredAmount);
    return withLatency(rows);
  },

  async update(id: ID, patch: Partial<Pick<Broker, "email" | "phone" | "billingEmail" | "notes" | "address">>): Promise<Broker> {
    return withLatency(
      mutate((db) => {
        const broker = db.brokers.find((b) => b.id === id);
        if (!broker) throw new Error(`Broker ${id} not found`);
        Object.assign(broker, patch, { updatedAt: new Date().toISOString() });
        return broker;
      }),
    );
  },
};
