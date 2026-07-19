import { getDb, mutate } from "@/services/backend/store";
import { OWNER_ID } from "@/services/backend/seed";
import { byDateDesc, matchesSearch, notDeleted, withLatency } from "@/services/api/helpers";
import { uid } from "@/lib/utils";
import type { ID, ListParams } from "@/types/common";
import { DocumentKind, type StoredDocument } from "@/types/document";
import { ActivityType } from "@/types/communication";
import { logActivity } from "@/services/api/activity";

export interface DocumentFilters extends ListParams {
  kind?: DocumentKind | "all";
  loadId?: string;
  claimId?: string;
}

export interface DocumentInput {
  kind: DocumentKind;
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  loadId?: string | null;
  claimId?: string | null;
  brokerName?: string;
  tags?: string[];
}

export const documentsApi = {
  async list(filters?: DocumentFilters): Promise<StoredDocument[]> {
    const items = getDb()
      .documents.filter(notDeleted)
      .filter((d) => {
        if (filters?.kind && filters.kind !== "all" && d.kind !== filters.kind) return false;
        if (filters?.loadId && d.loadId !== filters.loadId) return false;
        if (filters?.claimId && d.claimId !== filters.claimId) return false;
        return matchesSearch(filters?.search, d.name, d.brokerName, d.aiSummary, ...d.tags);
      })
      .sort(byDateDesc((d) => d.createdAt));
    return withLatency(items);
  },

  async create(input: DocumentInput): Promise<StoredDocument> {
    return withLatency(
      mutate((db) => {
        const nowIso = new Date().toISOString();
        const doc: StoredDocument = {
          id: uid("doc"),
          kind: input.kind,
          name: input.name,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          url: input.url,
          loadId: input.loadId ?? null,
          claimId: input.claimId ?? null,
          brokerName: input.brokerName,
          tags: input.tags ?? [],
          createdAt: nowIso,
          updatedAt: nowIso,
          ownerId: OWNER_ID,
        };
        db.documents = [doc, ...db.documents];
        if (doc.claimId) {
          const claim = db.claims.find((c) => c.id === doc.claimId);
          if (claim && !claim.evidenceIds.includes(doc.id)) claim.evidenceIds.push(doc.id);
        }
        logActivity(db, {
          type: ActivityType.DocumentUploaded,
          title: `Document uploaded: ${doc.name}`,
          claimId: doc.claimId,
          loadId: doc.loadId,
          automated: false,
        });
        return doc;
      }),
    );
  },

  async remove(id: ID): Promise<void> {
    return withLatency(
      mutate((db) => {
        const doc = db.documents.find((d) => d.id === id);
        if (doc) doc.deletedAt = new Date().toISOString();
      }),
    );
  },
};
