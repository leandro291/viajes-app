import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { OrganizerStatus } from "../types/organizer";

const ensureClerkRole = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/clerk-role", () => ({ ensureClerkRole }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("operator-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-0000003000${n.toString(16).padStart(2, "0")}`;
  // [user, organizer, status, createdAt]
  const ROWS: Record<string, { user: string; org: string; status: OrganizerStatus; createdAt: Date; firstName: string | null }> = {
    pending: { user: id(1), org: id(2), status: "pending", createdAt: new Date("2020-01-01T00:00:00Z"), firstName: "Ana" },
    active: { user: id(3), org: id(4), status: "active", createdAt: new Date("2020-03-01T00:00:00Z"), firstName: null },
    suspended: { user: id(5), org: id(6), status: "suspended", createdAt: new Date("2020-02-01T00:00:00Z"), firstName: null },
  };
  const clerkIdOf = (tag: string) => `test_operator_${tag}`;
  const MISSING_ID = id(0x7f);

  let svc: typeof import("./operator-service");
  let dbModule: typeof import("@/lib/db");

  const cleanup = async () => {
    const { db, organizers, users } = dbModule;
    const all = Object.values(ROWS);
    await db.delete(organizers).where(inArray(organizers.id, all.map((r) => r.org)));
    await db.delete(users).where(inArray(users.id, all.map((r) => r.user)));
  };

  const statusOf = async (org: string) => {
    const { db, organizers } = dbModule;
    const [row] = await db.select({ status: organizers.status }).from(organizers).where(eq(organizers.id, org));
    return row.status;
  };

  const reset = async () => {
    const { db, organizers } = dbModule;
    for (const r of Object.values(ROWS)) {
      await db.update(organizers).set({ status: r.status }).where(eq(organizers.id, r.org));
    }
  };

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./operator-service");
    await cleanup();
    const { db, organizers, users } = dbModule;
    for (const [tag, r] of Object.entries(ROWS)) {
      await db.insert(users).values({
        id: r.user,
        clerkId: clerkIdOf(tag),
        email: `test-operator-${tag}@example.invalid`,
        firstName: r.firstName,
        lastName: r.firstName ? "Quispe" : null,
      });
      await db.insert(organizers).values({
        id: r.org,
        userId: r.user,
        businessName: `Operador de prueba ${tag}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: r.status,
        createdAt: r.createdAt,
      });
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    ensureClerkRole.mockReset();
    ensureClerkRole.mockResolvedValue("updated");
    await reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC1: listOperators pone pending primero, luego created_at desc, con correo y nombre", async () => {
    const mine = (await svc.listOperators()).filter((o) => Object.values(ROWS).some((r) => r.org === o.id));
    expect(mine.map((o) => o.id)).toEqual([ROWS.pending.org, ROWS.active.org, ROWS.suspended.org]);
    expect(mine[0]).toMatchObject({
      email: "test-operator-pending@example.invalid",
      userName: "Ana Quispe",
      status: "pending",
    });
    expect(mine[1].userName).toBeNull();
  });

  it("AC3: pending -> active asegura el rol organizer en Clerk y guarda", async () => {
    const result = await svc.setOperatorStatus(ROWS.pending.org, "active");
    expect(result).toEqual({ ok: true, status: "active" });
    expect(ensureClerkRole).toHaveBeenCalledWith(clerkIdOf("pending"), "organizer");
    expect(await statusOf(ROWS.pending.org)).toBe("active");
  });

  it("AC3: suspended -> active también asegura el rol", async () => {
    const result = await svc.setOperatorStatus(ROWS.suspended.org, "active");
    expect(result).toEqual({ ok: true, status: "active" });
    expect(ensureClerkRole).toHaveBeenCalledWith(clerkIdOf("suspended"), "organizer");
  });

  it("AC3: si Clerk rechaza -> CLERK_FAILED y la fila sigue pending", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    ensureClerkRole.mockRejectedValue(new Error("clerk down"));
    const result = await svc.setOperatorStatus(ROWS.pending.org, "active");
    expect(result).toMatchObject({ ok: false, code: "CLERK_FAILED" });
    expect(await statusOf(ROWS.pending.org)).toBe("pending");
  });

  it("AC3: fallo de BD tras Clerk ok -> PARTIAL; reintentar lo completa", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = dbModule;
    vi.spyOn(db, "update").mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const result = await svc.setOperatorStatus(ROWS.pending.org, "active");
    expect(result).toMatchObject({ ok: false, code: "PARTIAL" });
    expect(ensureClerkRole).toHaveBeenCalledTimes(1);
    expect(await statusOf(ROWS.pending.org)).toBe("pending");

    expect(await svc.setOperatorStatus(ROWS.pending.org, "active")).toEqual({ ok: true, status: "active" });
  });

  it("AC4: active -> suspended y pending -> suspended no llaman a Clerk", async () => {
    expect(await svc.setOperatorStatus(ROWS.active.org, "suspended")).toEqual({ ok: true, status: "suspended" });
    expect(await svc.setOperatorStatus(ROWS.pending.org, "suspended")).toEqual({ ok: true, status: "suspended" });
    expect(ensureClerkRole).not.toHaveBeenCalled();
    expect(await statusOf(ROWS.active.org)).toBe("suspended");
    expect(await statusOf(ROWS.pending.org)).toBe("suspended");
  });

  it("AC6: mismo estado -> ok sin llamar a Clerk ni escribir", async () => {
    expect(await svc.setOperatorStatus(ROWS.active.org, "active")).toEqual({ ok: true, status: "active" });
    expect(await svc.setOperatorStatus(ROWS.suspended.org, "suspended")).toEqual({ ok: true, status: "suspended" });
    expect(ensureClerkRole).not.toHaveBeenCalled();
  });

  it("AC6: id inexistente -> NOT_FOUND", async () => {
    expect(await svc.setOperatorStatus(MISSING_ID, "active")).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(ensureClerkRole).not.toHaveBeenCalled();
  });
});
