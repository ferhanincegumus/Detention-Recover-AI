import { getSupabase, currentOwnerId } from "@/services/supabase/client";
import type { Database } from "@/services/backend/store";
import { DEFAULT_SETTINGS } from "@/types/user";

/**
 * Mirror-store sync engine. The app operates on an in-memory `Database`
 * snapshot (identical to the mock store), and this module keeps that snapshot
 * in sync with Supabase: bootstrap loads every table into the snapshot, and
 * `syncChanges` diffs the snapshot against a shadow copy and upserts only what
 * changed. This lets every existing service work unchanged against Supabase.
 *
 * SMS (`messages`) has no table — it's disabled — so it is never synced.
 */

type SyncedCollection = "brokers" | "loads" | "claims" | "leads" | "documents" | "emails" | "followups" | "activities";

interface TableConfig {
  table: string;
  promote: (entity: Record<string, unknown>) => Record<string, unknown>;
}

const nullable = (v: unknown) => (v === undefined ? null : v);

const TABLES: Record<SyncedCollection, TableConfig> = {
  brokers: {
    table: "brokers",
    promote: (b) => ({ name: b.name, risk_level: nullable((b.intel as { riskLevel?: string })?.riskLevel), deleted_at: nullable(b.deletedAt) }),
  },
  loads: {
    table: "loads",
    promote: (l) => ({ broker_id: nullable(l.brokerId), reference_number: l.referenceNumber, claim_id: nullable(l.claimId), risk_level: nullable(l.riskLevel), deleted_at: nullable(l.deletedAt) }),
  },
  claims: {
    table: "claims",
    promote: (c) => ({ broker_id: nullable(c.brokerId), load_id: c.loadId, claim_number: c.claimNumber, status: c.status, deleted_at: nullable(c.deletedAt) }),
  },
  leads: {
    table: "leads",
    promote: (l) => ({ status: l.status, email: nullable(l.email), deleted_at: nullable(l.deletedAt) }),
  },
  documents: {
    table: "documents",
    promote: (d) => ({ load_id: nullable(d.loadId), claim_id: nullable(d.claimId), kind: d.kind, deleted_at: nullable(d.deletedAt) }),
  },
  emails: {
    table: "emails",
    promote: (e) => ({ claim_id: nullable(e.claimId), provider_message_id: nullable(e.providerMessageId), direction: e.direction, read: e.read }),
  },
  followups: {
    table: "followups",
    promote: (f) => ({ claim_id: f.claimId, status: f.status }),
  },
  activities: {
    table: "activities",
    promote: (a) => ({ type: a.type }),
  },
};

const COLLECTIONS = Object.keys(TABLES) as SyncedCollection[];

/** Load all tables into a fresh Database snapshot. */
export async function bootstrapDatabase(): Promise<Database> {
  const supabase = getSupabase();
  const ownerId = await currentOwnerId();

  const results = await Promise.all(
    COLLECTIONS.map(async (key) => {
      const { data, error } = await supabase.from(TABLES[key].table).select("data");
      if (error) throw error;
      return [key, (data ?? []).map((r) => r.data)] as const;
    }),
  );
  const collections = Object.fromEntries(results) as unknown as Omit<Database, "messages" | "settings">;

  // Settings singleton — seed defaults on first run.
  const { data: settingsRow } = await supabase.from("app_settings").select("data").eq("owner_id", ownerId).maybeSingle();
  const settings = settingsRow?.data ?? { ...DEFAULT_SETTINGS };
  if (!settingsRow) {
    await supabase.from("app_settings").upsert({ owner_id: ownerId, data: settings });
  }

  return { ...collections, messages: [], settings } as Database;
}

/** Deep clone for the shadow snapshot (structuredClone with JSON fallback). */
export function cloneDatabase(db: Database): Database {
  return typeof structuredClone === "function"
    ? structuredClone(db)
    : (JSON.parse(JSON.stringify(db)) as Database);
}

/** Diff the snapshot against the shadow and upsert only changed rows. */
export async function syncChanges(current: Database, shadow: Database): Promise<void> {
  const supabase = getSupabase();
  const ownerId = await currentOwnerId();

  for (const key of COLLECTIONS) {
    const { table, promote } = TABLES[key];
    const currentRows = current[key] as unknown as Record<string, unknown>[];
    const shadowRows = shadow[key] as unknown as Record<string, unknown>[];
    const shadowById = new Map(shadowRows.map((e) => [e.id as string, JSON.stringify(e)]));

    const changed = currentRows.filter((entity) => {
      const prev = shadowById.get(entity.id as string);
      return prev === undefined || prev !== JSON.stringify(entity);
    });
    if (changed.length === 0) continue;

    const payload = changed.map((entity) => ({ id: entity.id, owner_id: ownerId, ...promote(entity), data: entity }));
    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }

  // Settings.
  if (JSON.stringify(current.settings) !== JSON.stringify(shadow.settings)) {
    const { error } = await supabase.from("app_settings").upsert({ owner_id: ownerId, data: current.settings });
    if (error) throw error;
  }
}
