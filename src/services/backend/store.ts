import { seedDatabase } from "@/services/backend/seed";
import type { Broker } from "@/types/broker";
import type { Load } from "@/types/load";
import type { Claim } from "@/types/claim";
import type { CaseLead } from "@/types/lead";
import type { StoredDocument } from "@/types/document";
import type { Activity, EmailMessage, SmsMessage } from "@/types/communication";
import type { FollowUp } from "@/types/followup";
import type { AppSettings } from "@/types/user";
import { DEFAULT_SETTINGS } from "@/types/user";

/** The full mock dataset — one collection per entity, plus singleton settings. */
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

function persist(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
  } catch {
    /* storage full/unavailable — keep in-memory only */
  }
}

function load(): Database {
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

/** Access the singleton database, seeding + persisting on first use. */
export function getDb(): Database {
  if (!db) {
    db = load();
    persist();
  }
  return db;
}

/** Run a mutation against the db and persist the result. */
export function mutate<T>(fn: (database: Database) => T): T {
  const database = getDb();
  const result = fn(database);
  persist();
  return result;
}

/** Reset to a fresh seed — used by the "Reset demo data" settings action. */
export function resetDb(): void {
  db = seedDatabase();
  db.settings = { ...DEFAULT_SETTINGS };
  persist();
}
