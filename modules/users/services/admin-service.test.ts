import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/lib/auth/roles";

const clerk = vi.hoisted(() => ({
  findClerkUserByEmail: vi.fn(),
  getClerkRole: vi.fn(),
  setClerkRole: vi.fn(),
}));
vi.mock("@/lib/auth/clerk-role", () => clerk);

const resetClerk = () => Object.values(clerk).forEach((fn) => fn.mockReset());

const UUID = "00000000-0000-4000-8000-000000000001";

// lib/db lanza al importarse sin DATABASE_URL: cada bloque lo importa dinámico
// (el de arriba con un mock, el de abajo con la BD real).
describe("admin-service (sin BD)", () => {
  const whereUpdate = vi.fn();
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));
  const selectRows = vi.fn();
  const select = vi.fn(() => ({ from: () => ({ where: selectRows }) }));

  let svc: typeof import("./admin-service");
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    vi.resetModules();
    const schema = await import("@/lib/db/schema");
    vi.doMock("@/lib/db", () => ({ ...schema, db: { select, update } }));
    svc = await import("./admin-service");
  });

  afterAll(() => {
    vi.doUnmock("@/lib/db");
    vi.resetModules();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetClerk();
    whereUpdate.mockResolvedValue(undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  const asClerk = (role: Role) => clerk.findClerkUserByEmail.mockResolvedValue({ id: "user_x", role });

  it("AC3: correo sin coincidencia exacta -> EMAIL_NOT_FOUND sin escribir", async () => {
    clerk.findClerkUserByEmail.mockResolvedValue(null);
    expect(await svc.grantAdmin("ana@x.com")).toMatchObject({ ok: false, code: "EMAIL_NOT_FOUND" });
    expect(clerk.setClerkRole).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("AC4: alta de customer/organizer fija admin en Clerk y luego en users", async () => {
    for (const role of ["customer", "organizer"] as const) {
      vi.clearAllMocks();
      resetClerk();
      asClerk(role);
      expect(await svc.grantAdmin("ana@x.com")).toEqual({ ok: true });
      expect(clerk.setClerkRole).toHaveBeenCalledWith("user_x", "admin");
      expect(set).toHaveBeenCalledWith({ role: "admin" });
    }
  });

  it("AC4: alta de quien ya es admin es ok y no escribe", async () => {
    asClerk("admin");
    expect(await svc.grantAdmin("ana@x.com")).toEqual({ ok: true });
    expect(clerk.setClerkRole).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("AC5: alta de super_admin -> PROTECTED sin escribir", async () => {
    asClerk("super_admin");
    expect(await svc.grantAdmin("ana@x.com")).toMatchObject({ ok: false, code: "PROTECTED" });
    expect(clerk.setClerkRole).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("AC7: Clerk falla al buscar o escribir en el alta -> CLERK_FAILED sin tocar la BD", async () => {
    clerk.findClerkUserByEmail.mockRejectedValue(new Error("boom"));
    expect(await svc.grantAdmin("ana@x.com")).toMatchObject({ ok: false, code: "CLERK_FAILED" });

    asClerk("customer");
    clerk.setClerkRole.mockRejectedValue(new Error("boom"));
    expect(await svc.grantAdmin("ana@x.com")).toMatchObject({ ok: false, code: "CLERK_FAILED" });
    expect(update).not.toHaveBeenCalled();
  });

  it("AC7: fallo del espejo tras Clerk ok -> ok con log fijo", async () => {
    asClerk("customer");
    whereUpdate.mockRejectedValue(new Error("secreto@x.com"));
    expect(await svc.grantAdmin("ana@x.com")).toEqual({ ok: true });
    expect(errorSpy).toHaveBeenCalledWith("applyRole: falló el espejo en la BD");
  });

  it("AC6: id inexistente -> NOT_FOUND sin llamar a Clerk", async () => {
    selectRows.mockResolvedValue([]);
    expect(await svc.revokeAdmin(UUID)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(clerk.getClerkRole).not.toHaveBeenCalled();
  });

  it("AC6: baja de admin fija customer en Clerk y luego en users", async () => {
    selectRows.mockResolvedValue([{ clerkId: "user_x" }]);
    clerk.getClerkRole.mockResolvedValue("admin");
    expect(await svc.revokeAdmin(UUID)).toEqual({ ok: true });
    expect(clerk.setClerkRole).toHaveBeenCalledWith("user_x", "customer");
    expect(set).toHaveBeenCalledWith({ role: "customer" });
  });

  it("AC6: baja de quien ya no es admin es ok y no escribe", async () => {
    selectRows.mockResolvedValue([{ clerkId: "user_x" }]);
    for (const role of ["customer", "organizer"] as const) {
      clerk.getClerkRole.mockResolvedValue(role);
      expect(await svc.revokeAdmin(UUID)).toEqual({ ok: true });
    }
    expect(clerk.setClerkRole).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("AC5: baja de super_admin -> PROTECTED sin escribir", async () => {
    selectRows.mockResolvedValue([{ clerkId: "user_x" }]);
    clerk.getClerkRole.mockResolvedValue("super_admin");
    expect(await svc.revokeAdmin(UUID)).toMatchObject({ ok: false, code: "PROTECTED" });
    expect(clerk.setClerkRole).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("AC7: Clerk falla al leer o escribir en la baja -> CLERK_FAILED sin tocar la BD", async () => {
    selectRows.mockResolvedValue([{ clerkId: "user_x" }]);
    clerk.getClerkRole.mockRejectedValue(new Error("boom"));
    expect(await svc.revokeAdmin(UUID)).toMatchObject({ ok: false, code: "CLERK_FAILED" });

    clerk.getClerkRole.mockResolvedValue("admin");
    clerk.setClerkRole.mockRejectedValue(new Error("boom"));
    expect(await svc.revokeAdmin(UUID)).toMatchObject({ ok: false, code: "CLERK_FAILED" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe.skipIf(!process.env.DATABASE_URL)("admin-service (db)", () => {
  const RUN = crypto.randomUUID();
  // Fechas lejanas: quedan primero dentro de su grupo aunque haya otros admins.
  const ROWS = {
    superAdmin: { role: "super_admin", createdAt: new Date("2099-01-01T00:00:00Z"), firstName: "Sara" },
    adminOld: { role: "admin", createdAt: new Date("2099-02-01T00:00:00Z"), firstName: null },
    adminNew: { role: "admin", createdAt: new Date("2099-03-01T00:00:00Z"), firstName: "Ana" },
    customer: { role: "customer", createdAt: new Date("2099-04-01T00:00:00Z"), firstName: null },
  } as const;
  type Tag = keyof typeof ROWS;
  const clerkIdOf = (tag: Tag) => `user_test_${RUN}_${tag}`;

  let svc: typeof import("./admin-service");
  let dbModule: typeof import("@/lib/db");
  const ids = {} as Record<Tag, string>;

  const roleOf = async (tag: Tag) => {
    const { db, users } = dbModule;
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, ids[tag]));
    return row.role;
  };

  const cleanup = async () => {
    const { db, users } = dbModule;
    await db.delete(users).where(inArray(users.clerkId, (Object.keys(ROWS) as Tag[]).map(clerkIdOf)));
  };

  beforeAll(async () => {
    vi.doUnmock("@/lib/db");
    vi.resetModules();
    dbModule = await import("@/lib/db");
    svc = await import("./admin-service");
    const { db, users } = dbModule;
    for (const tag of Object.keys(ROWS) as Tag[]) {
      const [row] = await db
        .insert(users)
        .values({
          clerkId: clerkIdOf(tag),
          email: `test-${RUN}-${tag}@wayra.test`,
          firstName: ROWS[tag].firstName,
          lastName: ROWS[tag].firstName ? "Quispe" : null,
          role: ROWS[tag].role,
          createdAt: ROWS[tag].createdAt,
        })
        .returning({ id: users.id });
      ids[tag] = row.id;
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(resetClerk);

  it("AC1: listAdmins pone super_admin primero, luego created_at desc, sin customers", async () => {
    const mine = (await svc.listAdmins()).filter((a) => Object.values(ids).includes(a.id));
    expect(mine.map((a) => a.id)).toEqual([ids.superAdmin, ids.adminNew, ids.adminOld]);
    expect(mine[0]).toMatchObject({ name: "Sara Quispe", role: "super_admin" });
    expect(mine[2].name).toBeNull();
  });

  it("AC4: alta de un customer actualiza users.role", async () => {
    clerk.findClerkUserByEmail.mockResolvedValue({ id: clerkIdOf("customer"), role: "customer" });
    expect(await svc.grantAdmin(`test-${RUN}-customer@wayra.test`)).toEqual({ ok: true });
    expect(clerk.setClerkRole).toHaveBeenCalledWith(clerkIdOf("customer"), "admin");
    expect(await roleOf("customer")).toBe("admin");
  });

  it("AC6: baja de un admin deja users.role en customer", async () => {
    clerk.getClerkRole.mockResolvedValue("admin");
    expect(await svc.revokeAdmin(ids.adminOld)).toEqual({ ok: true });
    expect(clerk.setClerkRole).toHaveBeenCalledWith(clerkIdOf("adminOld"), "customer");
    expect(await roleOf("adminOld")).toBe("customer");
  });

  it("AC5/AC6: PROTECTED y NOT_FOUND no cambian la fila", async () => {
    clerk.getClerkRole.mockResolvedValue("super_admin");
    expect(await svc.revokeAdmin(ids.superAdmin)).toMatchObject({ ok: false, code: "PROTECTED" });
    expect(await roleOf("superAdmin")).toBe("super_admin");
    expect(await svc.revokeAdmin("00000000-0000-4000-8000-0000000000ff")).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("AC7: Clerk rechaza -> CLERK_FAILED y la fila no cambia", async () => {
    clerk.getClerkRole.mockResolvedValue("admin");
    clerk.setClerkRole.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await svc.revokeAdmin(ids.adminNew)).toMatchObject({ ok: false, code: "CLERK_FAILED" });
    expect(await roleOf("adminNew")).toBe("admin");
    vi.restoreAllMocks();
  });
});
