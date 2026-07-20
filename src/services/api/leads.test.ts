import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/services/backend/store";
import { leadsApi } from "@/services/api/leads";

describe("leadsApi.remove (soft delete)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
  });

  it("hides a deleted lead from the list but keeps others", async () => {
    const before = await leadsApi.list();
    expect(before.length).toBeGreaterThan(0);
    const target = before[0];

    await leadsApi.remove(target.id);

    const after = await leadsApi.list();
    expect(after.find((l) => l.id === target.id)).toBeUndefined();
    expect(after.length).toBe(before.length - 1);
  });

  it("is a no-op for an unknown id", async () => {
    const before = await leadsApi.list();
    await leadsApi.remove("does-not-exist");
    const after = await leadsApi.list();
    expect(after.length).toBe(before.length);
  });
});
