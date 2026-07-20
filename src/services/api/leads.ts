import { getDb, mutate } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { byDateDesc, matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import { uid } from "@/lib/utils";
import { readPublicLeads } from "@/features/marketing/lead-submission";
import { isSupabaseBackend } from "@/config/env";
import type { ID, ListParams } from "@/types/common";
import { LeadStatus, type CaseLead, type LeadNote } from "@/types/lead";
import { ActivityType } from "@/types/communication";
import { logActivity } from "@/services/api/activity";

export interface LeadFilters extends ListParams {
  status?: LeadStatus | "all";
}

/** Pull any landing-page submissions into the leads collection (idempotent). */
function ingestPublicLeads(): void {
  // Supabase ingests leads via the public-lead-intake Edge Function, so this
  // localStorage bridge only applies to the mock backend.
  if (isSupabaseBackend) return;
  const publicLeads = readPublicLeads();
  if (publicLeads.length === 0) return;
  mutate((db) => {
    const existingIds = new Set(db.leads.map((l) => l.id));
    const fresh = publicLeads
      .filter((p) => !existingIds.has(p.id))
      .map<CaseLead>((p) => ({
        id: p.id,
        companyName: p.companyName,
        contactName: p.contactName,
        phone: p.phone,
        email: p.email,
        brokerName: p.brokerName,
        loadCount: p.loadCount,
        estimatedAmount: p.estimatedAmount ? Number(p.estimatedAmount) : undefined,
        details: p.details,
        status: LeadStatus.New,
        source: "landing",
        tags: [],
        notes: [],
        linkedClaimId: null,
        lastContactedAt: null,
        createdAt: p.submittedAt,
        updatedAt: p.submittedAt,
        ownerId: OWNER_ID,
      }));
    if (fresh.length) db.leads = [...fresh, ...db.leads];
  });
}

export const leadsApi = {
  async list(filters?: LeadFilters): Promise<CaseLead[]> {
    ingestPublicLeads();
    const items = getDb()
      .leads.filter(notDeleted)
      .filter((l) => {
        if (filters?.status && filters.status !== "all" && l.status !== filters.status) return false;
        return matchesSearch(filters?.search, l.companyName, l.contactName, l.brokerName, l.email, l.phone);
      })
      .sort(byDateDesc((l) => l.createdAt));
    return withLatency(items);
  },

  async get(id: ID): Promise<CaseLead | undefined> {
    ingestPublicLeads();
    return withLatency(getDb().leads.find((l) => l.id === id && notDeleted(l)));
  },

  async setStatus(id: ID, status: LeadStatus): Promise<CaseLead> {
    return withLatency(
      mutate((db) => {
        const lead = db.leads.find((l) => l.id === id);
        if (!lead) throw new Error(`Lead ${id} not found`);
        lead.status = status;
        lead.updatedAt = new Date().toISOString();
        if (status === LeadStatus.Contacted) lead.lastContactedAt = lead.updatedAt;
        return lead;
      }),
    );
  },

  async addNote(id: ID, body: string): Promise<CaseLead> {
    return withLatency(
      mutate((db) => {
        const lead = db.leads.find((l) => l.id === id);
        if (!lead) throw new Error(`Lead ${id} not found`);
        const note: LeadNote = { id: uid("note"), at: new Date().toISOString(), body };
        lead.notes = [note, ...lead.notes];
        lead.updatedAt = note.at;
        return lead;
      }),
    );
  },

  async setTags(id: ID, tags: string[]): Promise<CaseLead> {
    return withLatency(
      mutate((db) => {
        const lead = db.leads.find((l) => l.id === id);
        if (!lead) throw new Error(`Lead ${id} not found`);
        lead.tags = tags;
        lead.updatedAt = new Date().toISOString();
        return lead;
      }),
    );
  },

  /** Move a lead into active recovery. Idempotent on status. */
  async startRecovery(id: ID): Promise<CaseLead> {
    return withLatency(
      mutate((db) => {
        const lead = db.leads.find((l) => l.id === id);
        if (!lead) throw new Error(`Lead ${id} not found`);
        if (lead.status === LeadStatus.RecoveryStarted) return lead;
        lead.status = LeadStatus.RecoveryStarted;
        lead.updatedAt = new Date().toISOString();
        logActivity(db, {
          type: ActivityType.ClaimCreated,
          title: `Recovery started for ${lead.companyName}`,
          leadId: lead.id,
          automated: false,
        });
        return lead;
      }),
    );
  },
};
