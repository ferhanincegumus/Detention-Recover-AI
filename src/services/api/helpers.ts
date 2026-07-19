import { sleep } from "@/lib/utils";
import type { ListParams, Paginated } from "@/types/common";

/** Simulated network latency so loading states are exercised in the mock backend. */
export const LATENCY_MS = 220;

export async function withLatency<T>(value: T): Promise<T> {
  await sleep(LATENCY_MS);
  return value;
}

/** Case-insensitive multi-field search. */
export function matchesSearch(query: string | undefined, ...fields: (string | undefined | null)[]): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

/** Sort by an ISO date field, newest first by default. */
export function byDateDesc<T>(getDate: (item: T) => string | null | undefined) {
  return (a: T, b: T) => {
    const da = getDate(a);
    const db = getDate(b);
    return new Date(db ?? 0).getTime() - new Date(da ?? 0).getTime();
  };
}

export function paginate<T>(items: T[], params?: ListParams): Paginated<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = params?.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

/** Exclude soft-deleted records. */
export function notDeleted<T extends { deletedAt?: string | null }>(item: T): boolean {
  return !item.deletedAt;
}
