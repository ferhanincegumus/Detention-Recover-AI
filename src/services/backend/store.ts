import { seedDatabase } from "@/services/backend/seed";
import { isSupabaseBackend } from "@/config/env";
import type { Broker } from "@/types/broker";
import type { Load } from "@/types/load";
import type { Claim } from "@/types/claim";
import type { CaseLead } from "@/types/lead";
import type { StoredDocument } from "@/types/document";
import type { Activity, EmailMessage, SmsMessage } from "@/types/communication";
import type { FollowUp } from "@/types/followup";
import type { AppSettings } from "@/types/user";
import { DEFAULT_SETTINGS } from "@/types/user";

/** The full dataset — one collection per entity, plus singleton settings. */
export interface Database {
  brokers: Broker[];
  loads: Load[];
  claims: Claim[];
  leads: CaseLead[];
  documents: StoredDocument[];
  emails: EmailMessage[];
  messages: SmsMessage[];
  followups: FollowUp[];
  activities: Activity[];
  settings: AppSettings;
}

const STORAGE_KEY = "dra-mock-db";
const SCHEMA_VERSION = 3;
const VERSION_KEY = "dra-mock-db-version";

let db: Database | null = null;

/**
 * Supabase mirror-store hooks. When running against Supabase, the app operates
 * on an in-memory snapshot (`db`) that is bootstrapped from and synced back to
 * the database. These are wired by initDataStore() to avoid a static import
 * cycle (sync.ts imports this module's Database type).
 */
let supabaseShadow: Database | null = null;
let syncFn: ((current: Database, shadow: Database) => Promise<void>) | null = null;
let cloneFn: ((db: Database) => Database) | null = null;

function persistMock(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
  } catch {
    /* storage full/unavailable — keep in-memory only */
  }
}

function loadMock(): Database {
  try {
    const version = Number(localStorage.getItem(VERSION_KEY));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && version === SCHEMA_VERSION) {
      return JSON.parse(raw) as Database;
    }
  } catch {
    /* fall through to fresh seed */
  }
  const seeded = seedDatabase();
  seeded.settings = { ...DEFAULT_SETTINGS };
  return seeded;
}

/**
 * Bootstrap the store. In mock mode this is a no-op (lazy seed). In Supabase
 * mode it loads all tables into the in-memory snapshot and captures a shadow
 * for change-diffing. Must be awaited (post-auth) before rendering the app.
 */
export async function initDataStore(): Promise<void> {
  if (!isSupabaseBackend) return;
  const { bootstrapDatabase, syncChanges, cloneDatabase } = await import("@/services/supabase/sync");
  db = await bootstrapDatabase();
  supabaseShadow = cloneDatabase(db);
  syncFn = syncChanges;
  cloneFn = cloneDatabase;
}

/** Whether the store is ready for synchronous access. */
export function isStoreReady(): boolean {
  return isSupabaseBackend ? db !== null : true;
}

/** Access the singleton database. Mock mode seeds lazily; Supabase requires init. */
export function getDb(): Database {
  if (!db) {
    if (isSupabaseBackend) {
      throw new Error("Supabase store not initialized — call initDataStore() after sign-in.");
    }
    db = loadMock();
    persistMock();
  }
  return db;
}

/** Run a mutation against the db and persist the result. */
export function mutate<T>(fn: (database: Database) => T): T {
  const database = getDb();
  const result = fn(database);
  if (isSupabaseBackend) {
    // Push changes to Supabase in the background; the in-memory snapshot is
    // already up to date so React Query refetches see fresh data immediately.
    if (syncFn && supabaseShadow && cloneFn) {
      const shadow = supabaseShadow;
      const clone = cloneFn;
      syncFn(database, shadow)
        .then(() => {
          supabaseShadow = clone(database);
        })
        .catch((err) => console.error("Supabase sync failed:", err));
    }
  } else {
    persistMock();
  }
  return result;
}

/** Reset to a fresh seed — mock demo only. */
export function resetDb(): void {
  if (isSupabaseBackend) return;
  db = seedDatabase();
  db.settings = { ...DEFAULT_SETTINGS };
  persistMock();
}
